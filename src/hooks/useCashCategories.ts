import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';

export const cashCategorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.enum(['income', 'expense']),
});

export type CashCategoryFormValues = z.infer<typeof cashCategorySchema>;

export type CashCategory = {
  id: string;
  name: string;
  type: 'income' | 'expense';
};

const DEFAULT_CATEGORIES: CashCategoryFormValues[] = [
  { name: 'Vendas', type: 'income' },
  { name: 'Ingredientes', type: 'expense' },
  { name: 'Embalagens', type: 'expense' },
  { name: 'Água / Luz', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
];

async function fetchCashCategories(userId: string): Promise<CashCategory[]> {
  const { data, error } = await supabase
    .from('cash_categories')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  if (error) throw error;

  if (data && data.length > 0) return data;

  // First time this user opens the cash flow: seed default categories.
  const { data: seeded, error: seedError } = await supabase
    .from('cash_categories')
    .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId })))
    .select('*');
  if (seedError) throw seedError;

  return (seeded ?? []).sort((a, b) => a.name.localeCompare(b.name));
}

export function useCashCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.cashCategories(user?.id ?? '');

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchCashCategories(user!.id),
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const createCategory = useMutation({
    mutationFn: async (values: CashCategoryFormValues) => {
      const { error } = await supabase
        .from('cash_categories')
        .insert([{ user_id: user!.id, ...values }]);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CashCategoryFormValues }) => {
      const { error } = await supabase
        .from('cash_categories')
        .update(values)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cash_categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    categories: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
