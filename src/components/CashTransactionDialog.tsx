import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import { type CashCategory } from './CashCategoryDialog';

export type CashTransaction = {
  id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  cash_categories?: { name: string } | null;
};

type CashTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: CashTransaction | null;
  onSave: () => void;
  categories: CashCategory[];
};

export const CashTransactionDialog = ({ open, onOpenChange, transactionToEdit, onSave, categories }: CashTransactionDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<string>('none');

  useEffect(() => {
    if (open) {
      if (transactionToEdit) {
        setDescription(transactionToEdit.description);
        setAmount(transactionToEdit.amount.toFixed(2).replace('.', ','));
        setType(transactionToEdit.type);
        setDate(transactionToEdit.date);
        setCategoryId(transactionToEdit.category_id || 'none');
      } else {
        setDescription('');
        setAmount('');
        setType('expense');
        setDate(new Date().toISOString().split('T')[0]);
        setCategoryId('none');
      }
    }
  }, [open, transactionToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const parsedAmount = parseCurrencyInput(amount);
    if (parsedAmount <= 0) return;

    setLoading(true);
    
    const payload = {
      user_id: user.id,
      description,
      amount: parsedAmount,
      type,
      date,
      category_id: categoryId === 'none' ? null : categoryId,
    };

    let error;

    if (transactionToEdit) {
      const { error: updateError } = await supabase
        .from('cash_transactions')
        .update(payload)
        .eq('id', transactionToEdit.id)
        .eq('user_id', user.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('cash_transactions')
        .insert([payload]);
      error = insertError;
    }
      
    setLoading(false);
    
    if (!error) {
      onSave();
      onOpenChange(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: '500px', width: '90%' }} className="bg-surface-container-lowest border-2 border-primary-container rounded-3xl shadow-[0_10px_25px_rgba(159,64,45,0.2)]">
        <DialogHeader>
          <DialogTitle className="font-headline-sm text-primary">
            {transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-label-md text-on-surface-variant">Tipo</Label>
              <Select value={type} onValueChange={(val: 'income' | 'expense') => {
                setType(val);
                setCategoryId('none'); // reset category when type changes
              }}>
                <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 w-full focus:ring-primary-container">
                  <SelectValue>{type === 'income' ? 'Entrada' : 'Saída'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Entrada</SelectItem>
                  <SelectItem value="expense">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-label-md text-on-surface-variant">Data</Label>
              <Input 
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-label-md text-on-surface-variant">Descrição</Label>
            <Input 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Venda de bolo, Compra de farinha..."
              className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-label-md text-on-surface-variant">Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">R$</span>
                <Input 
                  value={amount}
                  onChange={e => setAmount(formatCurrencyInput(e.target.value))}
                  placeholder="0,00"
                  className="pl-9 bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container text-right"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-label-md text-on-surface-variant">Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 w-full focus:ring-primary-container">
                  <SelectValue>
                    {categoryId === 'none' 
                      ? 'Sem categoria' 
                      : categories.find(c => c.id === categoryId)?.name || 'Sem categoria'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {filteredCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            <button 
              type="button" 
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-surface-container text-on-surface font-bold text-[13px] py-2.5 rounded-xl hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading || !description.trim() || !amount}
              className={`flex-1 text-white font-bold text-[13px] py-2.5 rounded-xl transition-all disabled:opacity-50 ${type === 'income' ? 'bg-primary hover:bg-primary/90' : 'bg-error hover:bg-error/90'}`}
            >
              {loading ? 'Salvando...' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
