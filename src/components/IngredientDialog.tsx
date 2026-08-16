import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export type Ingredient = {
  id?: string;
  name: string;
  purchase_unit: string;
  purchase_quantity: number;
  purchase_price: number;
  current_stock: number;
  min_stock_limit: number;
  category: string;
  supplier_id: string | null;
  suppliers?: { name: string } | null;
};



type IngredientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredientToEdit?: Ingredient | null;
  onSave: (ingredient: Ingredient) => void;
};

export const IngredientDialog = ({ open, onOpenChange, ingredientToEdit, onSave }: IngredientDialogProps) => {
  const { user } = useAuth();
  
  // Form State
  const [name, setName] = useState('');
  const [purchaseUnit, setPurchaseUnit] = useState('kg');

  const [category, setCategory] = useState('Ingrediente');
  const [minStockLimit, setMinStockLimit] = useState('0');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (ingredientToEdit) {
        setName(ingredientToEdit.name);
        setPurchaseUnit(ingredientToEdit.purchase_unit);
        setCategory(ingredientToEdit.category || 'Ingrediente');
        
        let initialMinStock = ingredientToEdit.min_stock_limit || 0;
        if (ingredientToEdit.purchase_unit === 'kg' || ingredientToEdit.purchase_unit === 'litro') {
          initialMinStock = initialMinStock / 1000;
        }
        setMinStockLimit(initialMinStock.toString());
      } else {
        setName('');
        setPurchaseUnit('kg');
        setCategory('Ingrediente');
        setMinStockLimit('0');
      }
    }
  }, [open, ingredientToEdit, user]);




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    let finalMinStock = parseFloat(minStockLimit) || 0;
    if (purchaseUnit === 'kg' || purchaseUnit === 'litro') {
      finalMinStock = finalMinStock * 1000;
    }

    let ingredientData: any = {
      user_id: user.id,
      name,
      category,
      purchase_unit: purchaseUnit,
      min_stock_limit: finalMinStock,
      last_updated: new Date().toISOString(),
    };

    if (!ingredientToEdit) {
      ingredientData = {
        ...ingredientData,
        purchase_quantity: 1,
        purchase_price: 0,
        supplier_id: null,
      };
    }

    let savedData;

    if (ingredientToEdit) {
      const { data } = await supabase
        .from('ingredients')
        .update(ingredientData)
        .eq('id', ingredientToEdit.id)
        .select('*, suppliers(name)')
        .single();
      savedData = data;
    } else {
      const { data } = await supabase
        .from('ingredients')
        .insert(ingredientData)
        .select('*, suppliers(name)')
        .single();
      savedData = data;
    }

    setSaving(false);
    if (savedData) {
      onSave(savedData as Ingredient);
      onOpenChange(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-surface-container-lowest border-2 border-primary-container rounded-3xl shadow-[0_10px_25px_rgba(159,64,45,0.2)] overflow-visible">
        <DialogHeader>
          <DialogTitle className="font-headline-sm text-primary">{ingredientToEdit ? 'Editar Ingrediente' : 'Novo Ingrediente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-on-surface">Categoria</Label>
              <Select value={category} onValueChange={(val) => setCategory(val || 'Ingrediente')}>
                <SelectTrigger className="bg-surface border-2 border-outline-variant rounded-2xl h-12">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ingrediente">Ingrediente</SelectItem>
                  <SelectItem value="Embalagem">Embalagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-on-surface">Nome do Item</Label>
              <Input
                id="name"
                required
                placeholder="Ex: Leite Condensado"
                className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-on-surface">Unidade</Label>
              <Select value={purchaseUnit} onValueChange={(val: string | null) => setPurchaseUnit(val || 'kg')}>
                <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Quilo (kg)</SelectItem>
                  <SelectItem value="g">Grama (g)</SelectItem>
                  <SelectItem value="litro">Litro (L)</SelectItem>
                  <SelectItem value="ml">Mililitro (ml)</SelectItem>
                  <SelectItem value="unidade">Unidade</SelectItem>
                  <SelectItem value="duzia">Dúzia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock_limit" className="text-on-surface">Estoque Mínimo</Label>
              <Input
                id="min_stock_limit"
                type="number"
                min="0"
                step="0.01"
                required
                className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12"
                value={minStockLimit}
                onChange={(e) => setMinStockLimit(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-[13px] py-3 rounded-[1.25rem] hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)] mt-4 disabled:opacity-50">
            <span className="material-symbols-outlined text-[18px]">{saving ? 'sync' : 'save'}</span>
            {ingredientToEdit ? 'Salvar Ingrediente' : 'Salvar & Selecionar'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
