import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';

export type StockMovement = {
  id: string;
  ingredient_id: string;
  type: 'in' | 'out';
  quantity: number;
  reason: 'manual' | 'recipe_production' | 'purchase';
  price: number | null;
  supplier_id: string | null;
  created_at: string;
  ingredients: { name: string; purchase_unit: string } | null;
  suppliers: { name: string } | null;
};

async function fetchStockMovements(userId: string): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*, ingredients(name, purchase_unit), suppliers(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Pass `enabled: false` while the movements tab/view isn't visible to avoid fetching it eagerly. */
export function useStockMovements(enabled: boolean = true) {
  const { user } = useAuth();
  const key = queryKeys.stockMovements(user?.id ?? '');

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchStockMovements(user!.id),
    enabled: !!user && enabled,
  });

  return {
    movements: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
