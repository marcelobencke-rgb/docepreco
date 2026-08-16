import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';

export type Pricing = {
  id: string;
  recipe_id: string;
  packaging_cost: number;
  labor_cost: number;
  fixed_costs: number;
  card_fee_percent: number;
  profit_margin_percent: number;
  suggested_price: number;
  saved_price: number | null;
  created_at: string;
  recipes: { name: string; yield: number; category: string } | null;
};

export type PricingInput = {
  recipe_id: string;
  packaging_cost: number;
  labor_cost: number;
  fixed_costs: number;
  card_fee_percent: number;
  profit_margin_percent: number;
  suggested_price: number;
  saved_price: number | null;
};

async function fetchPricings(userId: string): Promise<Pricing[]> {
  const { data, error } = await supabase
    .from('pricings')
    .select('*, recipes(name, yield, category)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function usePricings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.pricings(user?.id ?? '');

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchPricings(user!.id),
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  /** Updates the existing pricing for this recipe if one exists, otherwise creates one. */
  const savePricing = useMutation({
    mutationFn: async (input: PricingInput) => {
      const existing = (query.data ?? []).find((p) => p.recipe_id === input.recipe_id);
      if (existing) {
        const { error } = await supabase.from('pricings').update(input).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pricings')
          .insert({ ...input, user_id: user!.id, created_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const deletePricing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pricings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    pricings: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    savePricing,
    deletePricing,
  };
}
