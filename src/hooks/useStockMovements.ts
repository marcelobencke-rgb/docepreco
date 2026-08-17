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

export type PriceHistoryEntry = {
  price: number;
  quantity: number;
  created_at: string;
  suppliers: { name: string } | null;
};

async function fetchIngredientPriceHistory(ingredientId: string): Promise<PriceHistoryEntry[]> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('price, quantity, created_at, suppliers(name)')
    .eq('ingredient_id', ingredientId)
    .eq('type', 'in')
    .not('price', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PriceHistoryEntry[];
}

/** Purchase price history for a single ingredient — a separate, lean query (not derived from
 * useStockMovements(), which only loads once the Inventory "Movimentações" tab is opened). Only
 * fetches once `ingredientId` is set (e.g. when the history dialog opens). */
export function useIngredientPriceHistory(ingredientId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.ingredientPriceHistory(ingredientId ?? ''),
    queryFn: () => fetchIngredientPriceHistory(ingredientId!),
    enabled: !!ingredientId,
  });

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
