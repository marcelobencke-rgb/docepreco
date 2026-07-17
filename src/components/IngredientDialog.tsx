import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';

export type Ingredient = {
  id: string;
  name: string;
  purchase_unit: string;
  purchase_quantity: number;
  purchase_price: number;
  base_unit_cost: number;
  current_stock: number;
  category: string;
  supplier_id: string | null;
  suppliers?: { name: string } | null;
};

type Supplier = {
  id: string;
  name: string;
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
  const [purchaseQuantity, setPurchaseQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [category, setCategory] = useState('Ingrediente');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (ingredientToEdit) {
        setName(ingredientToEdit.name);
        setPurchaseUnit(ingredientToEdit.purchase_unit);
        setCategory(ingredientToEdit.category || 'Ingrediente');
      } else {
        setName('');
        setPurchaseUnit('kg');
        setCategory('Ingrediente');
      }
    }
  }, [open, ingredientToEdit, user]);


  const getBaseUnitLabel = (unit: string) => {
    if (unit === 'kg' || unit === 'g') return 'g';
    if (unit === 'litro' || unit === 'ml') return 'ml';
    return 'un';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    let ingredientData: any = {
      user_id: user.id,
      name,
      category,
      purchase_unit: purchaseUnit,
      last_updated: new Date().toISOString(),
    };

    if (!ingredientToEdit) {
      ingredientData = {
        ...ingredientData,
        purchase_quantity: 1,
        purchase_price: 0,
        base_unit_cost: 0,
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
              <Select value={category} onValueChange={setCategory}>
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
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-[#9F402D] text-white font-bold text-[13px] py-3 rounded-[1.25rem] hover:bg-[#8A3322] active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)] mt-4 disabled:opacity-50">
            <span className="material-symbols-outlined text-[18px]">{saving ? 'sync' : 'save'}</span>
            {ingredientToEdit ? 'Salvar Ingrediente' : 'Salvar & Selecionar'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
