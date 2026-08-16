import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';

export const recipeIngredientSchema = z.object({
  ingredient_id: z.string().min(1, 'Selecione um ingrediente'),
  quantity_used: z.coerce.number().min(0.01, 'Quantidade inválida'),
});

export const recipeSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  category: z.string().optional(),
  yield: z.coerce.number().min(0.01, 'Informe o rendimento'),
  prep_time_minutes: z.coerce.number().min(1, 'Informe o tempo de preparo'),
  recipe_ingredients: z.array(recipeIngredientSchema),
});

export type RecipeFormInput = z.input<typeof recipeSchema>;
export type RecipeFormValues = z.output<typeof recipeSchema>;

/** Free-form fields not validated by `recipeSchema` (rich-text steps / plain notes). */
export type RecipeMutationInput = RecipeFormValues & { instructions: string; notes: string };

export type RecipeIngredientJoin = {
  quantity_used: number;
  ingredients: {
    id: string;
    name: string;
    purchase_unit: string;
    current_stock: number;
    purchase_price: number;
    purchase_quantity: number;
  } | null;
};

export type Recipe = {
  id: string;
  name: string;
  category: string;
  yield: number;
  prep_time_minutes: number;
  instructions: string | null;
  notes: string | null;
  production_count: number;
  created_at: string;
  recipe_ingredients: RecipeIngredientJoin[];
};

async function fetchRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(quantity_used, ingredients(id, name, purchase_unit, current_stock, purchase_price, purchase_quantity))')
    .eq('user_id', userId)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export function useRecipes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.recipes(user?.id ?? '');

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchRecipes(user!.id),
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const invalidateAll = () => {
    invalidate();
    queryClient.invalidateQueries({ queryKey: queryKeys.ingredients(user?.id ?? '') });
    queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements(user?.id ?? '') });
  };

  const saveRecipe = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: RecipeMutationInput }) => {
      const recipeData = {
        user_id: user!.id,
        name: values.name,
        category: values.category || 'Sem Categoria',
        yield: values.yield,
        prep_time_minutes: values.prep_time_minutes,
        instructions: values.instructions,
        notes: values.notes,
        updated_at: new Date().toISOString(),
      };

      let recipeId = id;
      if (id) {
        const { error } = await supabase.from('recipes').update(recipeData).eq('id', id);
        if (error) throw error;
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', id);
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .insert({ ...recipeData, created_at: new Date().toISOString() })
          .select()
          .single();
        if (error) throw error;
        recipeId = data.id;
      }

      if (values.recipe_ingredients.length > 0) {
        const { error } = await supabase.from('recipe_ingredients').insert(
          values.recipe_ingredients.map((ri) => ({
            recipe_id: recipeId,
            ingredient_id: ri.ingredient_id,
            quantity_used: ri.quantity_used,
          }))
        );
        if (error) throw error;
      }

      return recipeId!;
    },
    onSuccess: invalidate,
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const finishProduction = useMutation({
    mutationFn: async (input: {
      recipe: Recipe;
      multiplier: number;
      skipDeduction: boolean;
    }) => {
      const { recipe, multiplier, skipDeduction } = input;
      const newCount = (recipe.production_count || 0) + multiplier;

      const { error: recipeError } = await supabase
        .from('recipes')
        .update({ production_count: newCount })
        .eq('id', recipe.id);
      if (recipeError) throw recipeError;

      if (!skipDeduction) {
        const updates = recipe.recipe_ingredients.flatMap((ri) => {
          if (!ri.ingredients) return [];
          const totalUsed = ri.quantity_used * multiplier;
          const newStock = Math.max(0, Number(ri.ingredients.current_stock) - totalUsed);
          return [
            supabase.from('ingredients').update({ current_stock: newStock }).eq('id', ri.ingredients.id),
            supabase.from('stock_movements').insert({
              ingredient_id: ri.ingredients.id,
              user_id: user!.id,
              type: 'out',
              quantity: totalUsed,
              reason: 'recipe_production',
              reference_id: recipe.id,
            }),
          ];
        });
        const results = await Promise.all(updates);
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      }

      return newCount;
    },
    onSuccess: invalidateAll,
  });

  return {
    recipes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveRecipe,
    deleteRecipe,
    finishProduction,
  };
}
