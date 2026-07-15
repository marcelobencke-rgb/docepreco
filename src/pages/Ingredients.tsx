import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

import { IngredientDialog } from '@/components/IngredientDialog';

type Ingredient = {
  id: string;
  name: string;
  purchase_unit: string;
  purchase_quantity: number;
  purchase_price: number;
  base_unit_cost: number;
  supplier_id: string | null;
  suppliers: { name: string } | null;
};

export const Ingredients = () => {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  const fetchIngredients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ingredients')
      .select('*, suppliers(name)')
      .eq('user_id', user.id)
      .order('name');
    if (data) setIngredients(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchIngredients();
  }, [user]);

  const getBaseUnitLabel = (unit: string) => {
    if (unit === 'kg' || unit === 'g') return 'g';
    if (unit === 'litro' || unit === 'ml') return 'ml';
    return 'un';
  };

  const handleOpenDialog = (ingredient?: Ingredient) => {
    setEditingIngredient(ingredient || null);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    setIsDialogOpen(false);
    fetchIngredients();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ingrediente?')) return;
    await supabase.from('ingredients').delete().eq('id', id);
    fetchIngredients();
  };

  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando ingredientes...</div>;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Meus Ingredientes</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">Sua despensa de itens.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleOpenDialog()}
            className="flex items-center justify-center gap-2 bg-[#9F402D] text-white font-bold text-[13px] px-4 py-2.5 rounded-[1.25rem] hover:bg-[#8A3322] active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Ingrediente
          </button>
          
          <IngredientDialog 
            open={isDialogOpen} 
            onOpenChange={setIsDialogOpen} 
            ingredientToEdit={editingIngredient} 
            onSave={handleSave} 
          />
        </div>
      </header>

      {/* List Container */}
      <div className="flex flex-col gap-4">
        {ingredients.length === 0 ? (
          <div className="py-xl flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-lowest rounded-3xl border-2 border-dashed border-surface-container">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">kitchen</span>
            <p className="font-body-md text-center max-w-md">Nenhum ingrediente cadastrado ainda. Adicione itens para calcular suas receitas.</p>
          </div>
        ) : (
          ingredients.map((ing) => (
            <div key={ing.id} className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sticker hover:scale-[1.01] transition-all relative overflow-hidden group border-2 border-surface-container gap-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              
              {/* Left side: Icon + Name */}
              <div className="flex items-center gap-4 flex-1 w-full relative z-10">
                <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-secondary text-[16px]">kitchen</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] text-[#3e1d15] font-medium mb-0.5 truncate" title={ing.name}>{ing.name}</h3>
                  <p className="text-[13px] text-[#87655F] truncate">
                    {ing.suppliers?.name ? `Fornecedor: ${ing.suppliers.name}` : 'Sem fornecedor listado'}
                  </p>
                </div>
              </div>

              {/* Middle: Stats */}
              <div className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-8 w-full md:w-auto px-0 md:px-6 relative z-10">
                <div className="text-right border-l-2 border-dashed border-surface-container-high pl-4 md:pl-6">
                  <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-0.5">Custo Base</p>
                  <span className="font-title-md text-primary font-bold">
                    {Number(ing.base_unit_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })}
                    <span className="font-label-sm text-outline ml-1">/{getBaseUnitLabel(ing.purchase_unit)}</span>
                  </span>
                </div>
              </div>

              {/* Right side: Actions */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end md:pl-4 md:border-l-2 border-surface-container-low relative z-10 pt-4 md:pt-0 border-t-2 md:border-t-0 border-dashed border-surface-container-high md:border-solid">
                <button onClick={() => handleOpenDialog(ing)} className="w-10 h-10 rounded-full bg-surface md:bg-transparent hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center shadow-sm md:shadow-none">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button onClick={() => handleDelete(ing.id)} className="w-10 h-10 rounded-full bg-surface md:bg-transparent hover:bg-error-container text-error transition-colors flex items-center justify-center shadow-sm md:shadow-none">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

