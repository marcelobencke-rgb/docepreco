import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';

export type ShoppingList = {
  id: string;
  name: string;
  status: 'pending' | 'completed';
  created_at: string;
  completed_at: string | null;
  supplier_id: string | null;
  suppliers: { name: string } | null;
};

async function fetchShoppingLists(userId: string): Promise<ShoppingList[]> {
  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*, suppliers(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useShoppingLists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.shoppingLists(user?.id ?? '');

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchShoppingLists(user!.id),
    enabled: !!user,
  });

  const createList = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('shopping_lists')
        .insert({ user_id: user!.id, name })
        .select('*, suppliers(name)')
        .single();
      if (error) throw error;
      return data as ShoppingList;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    lists: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createList,
  };
}
