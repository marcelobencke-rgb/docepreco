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
  
  // Supplier State
  const [supplierList, setSupplierList] = useState<Supplier[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');
    if (data) setSupplierList(data);
  };

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      if (ingredientToEdit) {
        setName(ingredientToEdit.name);
        setPurchaseUnit(ingredientToEdit.purchase_unit);
        setPurchaseQuantity(ingredientToEdit.purchase_quantity.toString());
        setPurchasePrice(formatCurrencyInput(ingredientToEdit.purchase_price));
        setSupplierId(ingredientToEdit.supplier_id);
        setSupplierSearch(ingredientToEdit.suppliers?.name || '');
      } else {
        setName('');
        setPurchaseUnit('kg');
        setPurchaseQuantity('');
        setPurchasePrice('');
        setSupplierId(null);
        setSupplierSearch('');
      }
    }
  }, [open, ingredientToEdit, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const calculateBaseUnitCost = (unit: string, qty: number, price: number) => {
    if (unit === 'kg' || unit === 'litro') return price / (qty * 1000);
    if (unit === 'duzia') return price / (qty * 12);
    return price / qty;
  };

  const getBaseUnitLabel = (unit: string) => {
    if (unit === 'kg' || unit === 'g') return 'g';
    if (unit === 'litro' || unit === 'ml') return 'ml';
    return 'un';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    const qty = parseFloat(purchaseQuantity);
    const price = parseCurrencyInput(purchasePrice);
    const baseCost = calculateBaseUnitCost(purchaseUnit, qty, price);

    let finalSupplierId = supplierId;

    if (!finalSupplierId && supplierSearch.trim()) {
      const { data: newSupplier } = await supabase
        .from('suppliers')
        .insert({ user_id: user.id, name: supplierSearch.trim() })
        .select()
        .single();
      
      if (newSupplier) {
        finalSupplierId = newSupplier.id;
      }
    } else if (!supplierSearch.trim()) {
      finalSupplierId = null;
    }

    const ingredientData = {
      user_id: user.id,
      name,
      purchase_unit: purchaseUnit,
      purchase_quantity: qty,
      purchase_price: price,
      base_unit_cost: baseCost,
      supplier_id: finalSupplierId,
      last_updated: new Date().toISOString(),
    };

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

  const filteredSuppliers = supplierList.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-surface-container-lowest border-2 border-primary-container rounded-3xl shadow-[0_10px_25px_rgba(159,64,45,0.2)] overflow-visible">
        <DialogHeader>
          <DialogTitle className="font-headline-sm text-primary">{ingredientToEdit ? 'Editar Ingrediente' : 'Novo Ingrediente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 overflow-visible">
          <div className="space-y-2">
            <Label htmlFor="dlg_name" className="font-label-md text-on-surface-variant">Nome do ingrediente</Label>
            <Input id="dlg_name" className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-label-md text-on-surface-variant">Unidade de compra</Label>
              <Select value={purchaseUnit} onValueChange={setPurchaseUnit}>
                <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
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
              <Label htmlFor="dlg_qty" className="font-label-md text-on-surface-variant">Qtd comprada</Label>
              <Input id="dlg_qty" type="number" step="0.01" min="0.01" className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" value={purchaseQuantity} onChange={(e) => setPurchaseQuantity(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dlg_price" className="font-label-md text-on-surface-variant">Preço pago (R$)</Label>
              <Input id="dlg_price" type="text" inputMode="numeric" className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" value={purchasePrice} onChange={(e) => setPurchasePrice(formatCurrencyInput(e.target.value))} required />
            </div>
            <div className="space-y-2 relative" ref={dropdownRef}>
              <Label htmlFor="dlg_supplier" className="font-label-md text-on-surface-variant">Fornecedor</Label>
              <Input 
                id="dlg_supplier" 
                placeholder="Buscar ou criar..."
                className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" 
                value={supplierSearch} 
                onChange={(e) => {
                  setSupplierSearch(e.target.value);
                  setSupplierId(null);
                  setShowSupplierDropdown(true);
                }} 
                onFocus={() => setShowSupplierDropdown(true)}
              />
              {showSupplierDropdown && (
                <div className="absolute top-[76px] left-0 w-full bg-surface-container-lowest border-2 border-outline-variant/50 rounded-2xl shadow-sticker z-[100] max-h-48 overflow-y-auto p-1">
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map(s => (
                      <div 
                        key={s.id} 
                        className="px-3 py-2 hover:bg-secondary-container hover:text-on-secondary-container rounded-xl cursor-pointer font-body-md text-on-surface transition-colors"
                        onClick={() => {
                          setSupplierId(s.id);
                          setSupplierSearch(s.name);
                          setShowSupplierDropdown(false);
                        }}
                      >
                        {s.name}
                      </div>
                    ))
                  ) : null}
                  
                  {supplierSearch.trim() && !filteredSuppliers.find(s => s.name.toLowerCase() === supplierSearch.toLowerCase()) && (
                    <div 
                      className="px-3 py-2 bg-primary-container/20 text-primary hover:bg-primary-container hover:text-on-primary-container rounded-xl cursor-pointer font-body-md font-bold transition-colors flex items-center gap-2"
                      onClick={() => {
                        setShowSupplierDropdown(false);
                      }}
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      Criar "{supplierSearch}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {purchasePrice && purchaseQuantity && (
            <div className="rounded-xl bg-surface-container-low border-2 border-primary/20 p-4 text-center mt-2">
              <p className="font-label-sm text-on-surface-variant mb-1">Custo base calculado:</p>
              <strong className="text-primary font-headline-sm">{(calculateBaseUnitCost(purchaseUnit, parseFloat(purchaseQuantity), parseFloat(purchasePrice))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })}</strong> 
              <span className="font-label-md text-on-surface-variant ml-1">por {getBaseUnitLabel(purchaseUnit)}</span>
            </div>
          )}
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary font-label-md py-4 rounded-full hover:scale-[1.02] active:scale-95 transition-all shadow-[inset_0px_4px_6px_rgba(255,255,255,0.4),_0px_4px_10px_rgba(159,64,45,0.3)] mt-4 disabled:opacity-50">
            <span className="material-symbols-outlined">{saving ? 'sync' : 'save'}</span>
            {ingredientToEdit ? 'Salvar Ingrediente' : 'Salvar & Selecionar'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
