import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';

export const ingredientSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  category: z.enum(['Ingrediente', 'Embalagem']),
  purchase_unit: z.enum(['kg', 'g', 'litro', 'ml', 'unidade', 'duzia']),
  // Entered by the user in the same unit as `purchase_unit` (e.g. kg, not g) — converted to
  // base units (g/ml) before being sent to Supabase, since that's how current_stock is stored.
  min_stock_limit_display: z.coerce.number().min(0, 'Deve ser maior ou igual a 0'),
});

export type IngredientFormInput = z.input<typeof ingredientSchema>;
export type IngredientFormValues = z.output<typeof ingredientSchema>;

export type Ingredient = {
  id: string;
  name: string;
  category: string;
  purchase_unit: string;
  purchase_quantity: number;
  purchase_price: number;
  base_unit_cost: number;
  current_stock: number;
  min_stock_limit: number;
  supplier_id: string | null;
  suppliers: { name: string } | null;
  recipe_ingredients?: { quantity_used: number; recipes: { name: string } }[];
};

export type StockMovementInput = {
  ingredientId: string;
  currentStock: number;
  type: 'in' | 'out';
  quantityInDisplayUnit: number;
  displayUnit: string;
  priceInReais: number | null;
  /** Already resolved (e.g. via useSuppliers().findOrCreateSupplier) — this hook does not look suppliers up. */
  supplierId: string | null;
};

const BASE_UNIT_MULTIPLIER: Record<string, number> = { kg: 1000, litro: 1000 };

async function fetchIngredients(userId: string): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*, suppliers(name), recipe_ingredients(quantity_used, recipes(name))')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

function toBaseUnitQuantity(quantity: number, unit: string) {
  return quantity * (BASE_UNIT_MULTIPLIER[unit] ?? 1);
}

export function useIngredients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.ingredients(user?.id ?? '');

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchIngredients(user!.id),
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const invalidateAll = () => {
    invalidate();
    queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements(user?.id ?? '') });
  };

  const toBasePayload = (values: IngredientFormValues) => ({
    name: values.name,
    category: values.category,
    purchase_unit: values.purchase_unit,
    min_stock_limit: toBaseUnitQuantity(values.min_stock_limit_display, values.purchase_unit),
    last_updated: new Date().toISOString(),
  });

  const createIngredient = useMutation({
    mutationFn: async (values: IngredientFormValues) => {
      const { data, error } = await supabase
        .from('ingredients')
        .insert({
          user_id: user!.id,
          ...toBasePayload(values),
          purchase_quantity: 1,
          purchase_price: 0,
          supplier_id: null,
        })
        .select('*, suppliers(name)')
        .single();
      if (error) throw error;
      return data as Ingredient;
    },
    onSuccess: invalidate,
  });

  const updateIngredient = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: IngredientFormValues }) => {
      const { data, error } = await supabase
        .from('ingredients')
        .update(toBasePayload(values))
        .eq('id', id)
        .select('*, suppliers(name)')
        .single();
      if (error) throw error;
      return data as Ingredient;
    },
    onSuccess: invalidate,
  });

  const deleteIngredient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ingredients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const registerStockMovement = useMutation({
    mutationFn: async (input: StockMovementInput) => {
      const qty = toBaseUnitQuantity(input.quantityInDisplayUnit, input.displayUnit);
      const supplierId = input.type === 'in' ? input.supplierId : null;

      const newStock =
        input.type === 'in' ? input.currentStock + qty : Math.max(0, input.currentStock - qty);

      const ingredientUpdate: Record<string, unknown> = { current_stock: newStock };
      if (input.type === 'in' && input.priceInReais && input.priceInReais > 0) {
        // Note: `base_unit_cost` was dropped from this table (see
        // supabase/migrations/011_remove_base_unit_cost.sql) — the original code still tried to
        // write it here, which made Supabase reject the whole update whenever a priced "in"
        // movement was registered. Only `supplier_id` is updated now; `purchase_price`/
        // `purchase_quantity` are intentionally left alone (that's the Shopping "finish purchase"
        // flow's job) rather than guessing a new costing convention here.
        ingredientUpdate.supplier_id = supplierId;
      }

      const [movementResult, ingredientResult] = await Promise.all([
        supabase.from('stock_movements').insert({
          ingredient_id: input.ingredientId,
          user_id: user!.id,
          type: input.type,
          quantity: qty,
          reason: input.type === 'in' ? 'purchase' : 'manual',
          price: input.type === 'in' ? input.priceInReais : null,
          supplier_id: input.type === 'in' ? supplierId : null,
        }),
        supabase.from('ingredients').update(ingredientUpdate).eq('id', input.ingredientId),
      ]);
      if (movementResult.error) throw movementResult.error;
      if (ingredientResult.error) throw ingredientResult.error;
    },
    onSuccess: invalidateAll,
  });

  return {
    ingredients: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    registerStockMovement,
  };
}
