import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { parseCurrencyInput } from '@/lib/utils';
import { queryKeys } from './queryKeys';

export const cashTransactionSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z
    .string()
    .min(1, 'Valor obrigatório')
    .transform(parseCurrencyInput)
    .refine((v) => v > 0, 'Valor deve ser maior que zero'),
  type: z.enum(['income', 'expense']),
  date: z.string().min(1, 'Data obrigatória'),
  category_id: z.string(), // 'none' sentinel, or a cash_categories.id
});

export type CashTransactionFormValues = z.output<typeof cashTransactionSchema>;
export type CashTransactionFormInput = z.input<typeof cashTransactionSchema>;

export type CashTransaction = {
  id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  cash_categories?: { name: string } | null;
};

async function fetchCashTransactions(userId: string, start: string, end: string): Promise<CashTransaction[]> {
  const { data, error } = await supabase
    .from('cash_transactions')
    .select('*, cash_categories(name)')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useCashTransactions(startDate: string, endDate: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.cashTransactions(user?.id ?? '', startDate, endDate);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchCashTransactions(user!.id, startDate, endDate),
    enabled: !!user,
  });

  // Invalidate every date range cached for this user, since editing a transaction's
  // date can move it in or out of whichever range is currently being viewed.
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['cashTransactions', user?.id] });

  const toPayload = (values: CashTransactionFormValues) => ({
    user_id: user!.id,
    description: values.description,
    amount: values.amount,
    type: values.type,
    date: values.date,
    category_id: values.category_id === 'none' ? null : values.category_id,
  });

  const createTransaction = useMutation({
    mutationFn: async (values: CashTransactionFormValues) => {
      const { error } = await supabase.from('cash_transactions').insert([toPayload(values)]);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CashTransactionFormValues }) => {
      const { error } = await supabase
        .from('cash_transactions')
        .update(toPayload(values))
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cash_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    transactions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
