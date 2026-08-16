import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useIngredients,
  ingredientSchema,
  type Ingredient,
  type IngredientFormInput,
  type IngredientFormValues,
} from '@/hooks/useIngredients';

export type { Ingredient };

const UNIT_LABELS: Record<string, string> = {
  kg: 'Quilo (kg)',
  g: 'Grama (g)',
  litro: 'Litro (L)',
  ml: 'Mililitro (ml)',
  unidade: 'Unidade',
  duzia: 'Dúzia',
};

const BASE_UNIT_MULTIPLIER: Record<string, number> = { kg: 1000, litro: 1000 };

type IngredientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredientToEdit?: Ingredient | null;
  onSave?: (ingredient: Ingredient) => void;
};

export const IngredientDialog = ({ open, onOpenChange, ingredientToEdit, onSave }: IngredientDialogProps) => {
  const { createIngredient, updateIngredient } = useIngredients();

  const defaultValues: IngredientFormInput = ingredientToEdit
    ? {
        name: ingredientToEdit.name,
        category: (ingredientToEdit.category as 'Ingrediente' | 'Embalagem') || 'Ingrediente',
        purchase_unit: ingredientToEdit.purchase_unit as IngredientFormInput['purchase_unit'],
        min_stock_limit_display:
          (ingredientToEdit.min_stock_limit || 0) / (BASE_UNIT_MULTIPLIER[ingredientToEdit.purchase_unit] ?? 1),
      }
    : {
        name: '',
        category: 'Ingrediente',
        purchase_unit: 'kg',
        min_stock_limit_display: 0,
      };

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IngredientFormInput, unknown, IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    values: defaultValues,
  });

  const onSubmit = async (values: IngredientFormValues) => {
    const saved = ingredientToEdit
      ? await updateIngredient.mutateAsync({ id: ingredientToEdit.id, values })
      : await createIngredient.mutateAsync(values);
    onSave?.(saved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-surface-container-lowest border-2 border-primary-container rounded-3xl shadow-[0_10px_25px_rgba(159,64,45,0.2)] overflow-visible">
        <DialogHeader>
          <DialogTitle className="font-headline-sm text-primary">{ingredientToEdit ? 'Editar Ingrediente' : 'Novo Ingrediente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-on-surface">Categoria</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(val) => field.onChange(val || 'Ingrediente')}>
                    <SelectTrigger className="bg-surface border-2 border-outline-variant rounded-2xl h-12">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ingrediente">Ingrediente</SelectItem>
                      <SelectItem value="Embalagem">Embalagem</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-on-surface">Nome do Item</Label>
              <Input
                id="name"
                placeholder="Ex: Leite Condensado"
                aria-invalid={!!errors.name}
                className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12"
                {...register('name')}
              />
              {errors.name && <p className="text-[12px] text-error">{errors.name.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-on-surface">Unidade</Label>
              <Controller
                control={control}
                name="purchase_unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(val) => field.onChange(val || 'kg')}>
                    <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12">
                      <SelectValue>{(v: string) => UNIT_LABELS[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock_limit" className="text-on-surface">Estoque Mínimo</Label>
              <Input
                id="min_stock_limit"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={!!errors.min_stock_limit_display}
                className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12"
                {...register('min_stock_limit_display')}
              />
              {errors.min_stock_limit_display && <p className="text-[12px] text-error">{errors.min_stock_limit_display.message}</p>}
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-[13px] py-3 rounded-[1.25rem] hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)] mt-4 disabled:opacity-50">
            <span className="material-symbols-outlined text-[18px]">{isSubmitting ? 'sync' : 'save'}</span>
            {ingredientToEdit ? 'Salvar Ingrediente' : 'Salvar & Selecionar'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
