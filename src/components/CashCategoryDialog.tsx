import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type CashCategory = {
  id: string;
  name: string;
  type: 'income' | 'expense';
};

type CashCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
};

export const CashCategoryDialog = ({ open, onOpenChange, onSave }: CashCategoryDialogProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<CashCategory | null>(null);

  useEffect(() => {
    if (open && user) {
      loadCategories();
    }
  }, [open, user]);

  const loadCategories = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('cash_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
      
    if (!error && data) {
      setCategories(data);
    }
  };

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    
    setLoading(true);
    
    if (editingCategory) {
      const { error } = await supabase
        .from('cash_categories')
        .update({ name: name.trim(), type })
        .eq('id', editingCategory.id)
        .eq('user_id', user.id);

      if (!error) {
        setEditingCategory(null);
        setName('');
        setType('expense');
        loadCategories();
        onSave();
      }
    } else {
      const { error } = await supabase
        .from('cash_categories')
        .insert([{
          user_id: user.id,
          name: name.trim(),
          type
        }]);
      
      if (!error) {
        setName('');
        loadCategories();
        onSave();
      }
    }
    setLoading(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setName('');
      setType('expense');
      setEditingCategory(null);
    }
    onOpenChange(isOpen);
  };

  const handleDeleteClick = (id: string) => {
    setCategoryToDelete(id);
  };

  const confirmDelete = async () => {
    if (!user || !categoryToDelete) return;
    
    await supabase
      .from('cash_categories')
      .delete()
      .eq('id', categoryToDelete)
      .eq('user_id', user.id);
      
    setCategoryToDelete(null);
    loadCategories();
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh' }} className="flex flex-col bg-surface-container-lowest border-2 border-primary-container rounded-3xl shadow-[0_10px_25px_rgba(159,64,45,0.2)]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-headline-sm text-primary">Gerenciar Categorias</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 overflow-hidden pt-2">
          <form onSubmit={handleAddOrEdit} className="shrink-0 flex flex-col gap-4 bg-surface p-4 rounded-2xl border-2 border-surface-container-low transition-all">
            <div className="flex justify-between items-center">
              <h3 className="font-label-md text-on-surface-variant font-bold">
                {editingCategory ? 'Editar Categoria' : 'Adicionar Nova Categoria'}
              </h3>
              {editingCategory && (
                <button 
                  type="button" 
                  onClick={() => { setEditingCategory(null); setName(''); setType('expense'); }}
                  className="text-[12px] text-primary font-bold hover:underline"
                >
                  Cancelar Edição
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label className="text-[12px]">Nome</Label>
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Ex: Vendas, Água, Ingredientes..."
                  className="bg-surface-container-lowest border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container"
                  required
                />
              </div>
              <div className="w-32 space-y-2">
                <Label className="text-[12px]">Tipo</Label>
                <Select value={type} onValueChange={(val: 'income' | 'expense') => setType(val)}>
                  <SelectTrigger className="bg-surface-container-lowest border-2 border-outline-variant font-body-md rounded-xl !h-10 w-full">
                    <SelectValue>{type === 'income' ? 'Entrada' : 'Saída'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Entrada</SelectItem>
                    <SelectItem value="expense">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading || !name.trim()}
              className="w-full bg-primary text-white font-bold text-[13px] py-2.5 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Salvando...' : (editingCategory ? 'Salvar Alterações' : 'Adicionar Categoria')}
            </button>
          </form>

          <div className="flex-1 overflow-y-auto pr-2 pb-2 space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <h3 className="font-label-md text-on-surface-variant font-bold mb-3">Categorias Existentes</h3>
            {categories.length === 0 ? (
              <p className="text-center text-[13px] text-on-surface-variant py-4">Nenhuma categoria cadastrada.</p>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border-2 border-surface-container-low transition-all hover:border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${cat.type === 'income' ? 'bg-primary text-white' : 'bg-error text-white'}`}>
                      <span className="material-symbols-outlined text-[18px]">
                        {cat.type === 'income' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    </div>
                    <span className="font-bold text-[14px] text-on-surface">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => { setEditingCategory(cat); setName(cat.name); setType(cat.type); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-primary hover:bg-primary-container transition-colors"
                      title="Editar Categoria"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(cat.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error-container transition-colors"
                      title="Excluir Categoria"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>

      <Dialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-surface-container-lowest border-2 border-primary-container rounded-3xl shadow-[0_10px_25px_rgba(159,64,45,0.2)]">
          <DialogHeader>
            <DialogTitle className="font-headline-sm text-primary">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[14px] text-on-surface-variant">Tem certeza que deseja excluir esta categoria?</p>
            <p className="text-[14px] text-on-surface-variant font-medium mt-2">As transações vinculadas a ela perderão a categoria.</p>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-surface-container-low">
            <button 
              onClick={() => setCategoryToDelete(null)}
              className="px-4 py-2 bg-surface-container text-on-surface font-bold text-[13px] rounded-xl hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmDelete}
              className="px-4 py-2 bg-error text-white font-bold text-[13px] rounded-xl hover:bg-error/90 transition-all shadow-[0_4px_12px_rgba(255,0,0,0.2)]"
            >
              Sim, excluir
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
