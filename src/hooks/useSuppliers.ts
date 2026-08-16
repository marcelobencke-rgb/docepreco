import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';

export const supplierSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  contact_info: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  cnpj: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

export type Supplier = {
  id: string;
  name: string;
  contact_info: string | null;
  email: string | null;
  cnpj: string | null;
};

async function fetchSuppliers(userId: string): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export function useSuppliers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.suppliers(user?.id ?? '');

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchSuppliers(user!.id),
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const createSupplier = useMutation({
    mutationFn: async (values: SupplierFormValues) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          user_id: user!.id,
          name: values.name,
          contact_info: values.contact_info || null,
          email: values.email || null,
          cnpj: values.cnpj || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Supplier;
    },
    onSuccess: invalidate,
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: SupplierFormValues }) => {
      const { error } = await supabase
        .from('suppliers')
        .update({
          name: values.name,
          contact_info: values.contact_info || null,
          email: values.email || null,
          cnpj: values.cnpj || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Returns the id of an existing supplier matching `name` (case-insensitive), or creates one. */
  const findOrCreateSupplier = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      const existing = (query.data ?? []).find(
        (s) => s.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) return existing.id;

      const { data, error } = await supabase
        .from('suppliers')
        .insert({ user_id: user!.id, name: trimmed })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: invalidate,
  });

  return {
    suppliers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    findOrCreateSupplier,
  };
}
