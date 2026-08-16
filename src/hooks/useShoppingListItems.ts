import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';
import type { ShoppingList } from './useShoppingLists';

export type ShoppingListItem = {
  id: string;
  list_id: string;
  ingredient_id: string;
  quantity: number;
  price: number;
  purchased: boolean;
  ingredients: {
    name: string;
    purchase_unit: string;
    current_stock: number;
    purchase_quantity: number;
    purchase_price: number;
  } | null;
};

const ITEM_SELECT = '*, ingredients(name, purchase_unit, current_stock, purchase_quantity, purchase_price)';

async function fetchShoppingListItems(listId: string): Promise<ShoppingListItem[]> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select(ITEM_SELECT)
    .eq('list_id', listId)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export function useShoppingListItems(listId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.shoppingListItems(listId ?? '');

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchShoppingListItems(listId!),
    enabled: !!listId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const addItem = useMutation({
    mutationFn: async (ingredientId: string) => {
      const { error } = await supabase
        .from('shopping_list_items')
        .insert({ list_id: listId!, ingredient_id: ingredientId, quantity: 1, price: 0 });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addItemsFromRecipe = useMutation({
    mutationFn: async (recipeId: string) => {
      const { data: riData, error } = await supabase
        .from('recipe_ingredients')
        .select('ingredient_id, quantity_used, ingredients(purchase_unit)')
        .eq('recipe_id', recipeId) as unknown as {
          data: { ingredient_id: string; quantity_used: number; ingredients: { purchase_unit: string } | null }[] | null;
          error: { message: string } | null;
        };
      if (error) throw error;
      if (!riData || riData.length === 0) return;

      const newItems = riData.map((ri) => {
        const pUnit = ri.ingredients?.purchase_unit;
        const buyQty = (pUnit === 'kg' || pUnit === 'litro') ? ri.quantity_used / 1000 : ri.quantity_used;
        return { list_id: listId!, ingredient_id: ri.ingredient_id, quantity: buyQty, price: 0 };
      });

      const { error: insertError } = await supabase.from('shopping_list_items').insert(newItems);
      if (insertError) throw insertError;
    },
    onSuccess: invalidate,
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shopping_list_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const togglePurchased = useMutation({
    mutationFn: async (item: ShoppingListItem) => {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({ purchased: !item.purchased })
        .eq('id', item.id);
      if (error) throw error;
    },
    onMutate: (item) => {
      queryClient.setQueryData<ShoppingListItem[]>(key, (old) =>
        old?.map((i) => (i.id === item.id ? { ...i, purchased: !i.purchased } : i))
      );
    },
  });

  /** Fire-and-forget style update (matches the original "instant typing, background save" UX). */
  const updateItemField = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'price' | 'quantity'; value: number }) => {
      const { error } = await supabase.from('shopping_list_items').update({ [field]: value }).eq('id', id);
      if (error) throw error;
    },
    onMutate: ({ id, field, value }) => {
      queryClient.setQueryData<ShoppingListItem[]>(key, (old) =>
        old?.map((i) => (i.id === id ? { ...i, [field]: value } : i))
      );
    },
  });

  const finishList = useMutation({
    mutationFn: async ({ list, supplierId }: { list: ShoppingList; supplierId: string | null }) => {
      const items = query.data ?? [];

      const updates = items.flatMap((item) => {
        if (!item.ingredients) return [];
        let actualQtyInBase = Number(item.quantity);
        if (item.ingredients.purchase_unit === 'kg' || item.ingredients.purchase_unit === 'litro') actualQtyInBase *= 1000;
        else if (item.ingredients.purchase_unit === 'duzia') actualQtyInBase *= 12;

        const newStock = Number(item.ingredients.current_stock) + actualQtyInBase;
        const newPurchasePrice = Number(item.price) > 0 ? Number(item.price) : Number(item.ingredients.purchase_price);

        return [
          supabase.from('ingredients').update({
            current_stock: newStock,
            purchase_price: newPurchasePrice,
            purchase_quantity: Number(item.quantity),
          }).eq('id', item.ingredient_id),
          supabase.from('stock_movements').insert({
            ingredient_id: item.ingredient_id,
            user_id: user!.id,
            type: 'in',
            quantity: actualQtyInBase,
            reason: 'purchase',
            reference_id: list.id,
            price: newPurchasePrice,
            supplier_id: supplierId,
          }),
        ];
      });

      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      const { error } = await supabase
        .from('shopping_lists')
        .update({ status: 'completed', completed_at: new Date().toISOString(), supplier_id: supplierId })
        .eq('id', list.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: queryKeys.ingredients(user?.id ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements(user?.id ?? '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists(user?.id ?? '') });
    },
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addItem,
    addItemsFromRecipe,
    deleteItem,
    togglePurchased,
    updateItemField,
    finishList,
  };
}
