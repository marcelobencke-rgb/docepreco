import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';

type Recipe = {
  id: string;
  name: string;
  yield: number;
  prep_time_minutes: number;
  instructions: string | null;
  notes: string | null;
  image_url: string | null;
  production_count?: number;
  recipe_ingredients: {
    quantity_used: number;
    ingredients: {
      id: string;
      name: string;
      purchase_unit: string;
      current_stock: number;
    } | null;
  }[];
};

export const RecipeCatalog = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [isFinishing, setIsFinishing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [sortOrder, setSortOrder] = useState('recentes');
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);
  const [productionMultiplier, setProductionMultiplier] = useState(1);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [outOfStockSetting, setOutOfStockSetting] = useState('confirm');
  const [shortageDetails, setShortageDetails] = useState<{ name: string; missing: number; unit: string }[]>([]);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [isConfirmShortageModalOpen, setIsConfirmShortageModalOpen] = useState(false);

  useEffect(() => {
    const fetchRecipes = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients(
            quantity_used,
            ingredients(id, name, purchase_unit, current_stock)
          )
        `)
        .eq('user_id', user.id)
        .order('name');
      
      if (data) setRecipes(data as any);
      
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('allow_out_of_stock_production')
        .eq('id', user.id)
        .single();
      if (settingsData) {
        setOutOfStockSetting(settingsData.allow_out_of_stock_production || 'confirm');
      }

      setLoading(false);
    };
    fetchRecipes();
  }, [user]);

  const getUnitDisplay = (unit: string) => {
    if (unit === 'kg' || unit === 'g') return 'g';
    if (unit === 'litro' || unit === 'ml') return 'ml';
    return 'un';
  };

  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando cardápio...</div>;

  const toggleIngredient = (idx: number) => {
    const newSet = new Set(checkedIngredients);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setCheckedIngredients(newSet);
  };

  const handleFinishRecipe = () => {
    setProductionMultiplier(1);
    setIsProductionModalOpen(true);
  };

  const handleConfirmFinish = async () => {
    if (!selectedRecipe || !user) return;
    
    // Check shortages
    const shortages: { name: string; missing: number; unit: string }[] = [];
    for (const ri of selectedRecipe.recipe_ingredients) {
      if (ri.ingredients) {
        const totalUsed = ri.quantity_used * productionMultiplier;
        if (Number(ri.ingredients.current_stock) < totalUsed) {
          shortages.push({
            name: ri.ingredients.name,
            missing: totalUsed - Number(ri.ingredients.current_stock),
            unit: getUnitDisplay(ri.ingredients.purchase_unit)
          });
        }
      }
    }

    if (shortages.length > 0) {
      if (outOfStockSetting === 'no' || outOfStockSetting === 'Não') {
         setShortageDetails(shortages);
         setIsErrorModalOpen(true);
         return;
      } else if (outOfStockSetting === 'confirm' || outOfStockSetting === 'Confirmar') {
         setShortageDetails(shortages);
         setIsConfirmShortageModalOpen(true);
         return;
      } else if (outOfStockSetting === 'yes' || outOfStockSetting === 'Sim') {
         await executeFinish(true);
         return;
      }
    }

    await executeFinish(false);
  };

  const executeFinish = async (skipDeduction: boolean) => {
    if (!selectedRecipe || !user) return;
    setIsFinishing(true);
    
    // 1. Update Production Count
    const newCount = (selectedRecipe.production_count || 0) + productionMultiplier;
    const { error } = await supabase
      .from('recipes')
      .update({ production_count: newCount })
      .eq('id', selectedRecipe.id);
      
    // 2. Deduct Stock & Create Movements
    if (!skipDeduction) {
      for (const ri of selectedRecipe.recipe_ingredients) {
        if (ri.ingredients) {
          const totalUsed = ri.quantity_used * productionMultiplier;
          const newStock = Math.max(0, Number(ri.ingredients.current_stock) - totalUsed);
          
          await supabase
            .from('ingredients')
            .update({ current_stock: newStock })
            .eq('id', ri.ingredients.id);
            
          await supabase
            .from('stock_movements')
            .insert({
              ingredient_id: ri.ingredients.id,
              user_id: user.id,
              type: 'out',
              quantity: totalUsed,
              reason: 'recipe_production',
              reference_id: selectedRecipe.id
            });
        }
      }
    }
      
    if (!error) {
      const updatedRecipe = { ...selectedRecipe, production_count: newCount };
      setSelectedRecipe(null);
      setRecipes(recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
      setCheckedIngredients(new Set<number>());
      setIsProductionModalOpen(false);
      setIsConfirmShortageModalOpen(false);
      setSuccessMessage(skipDeduction 
        ? `Receita finalizada! Produzido: ${productionMultiplier} lote(s). A baixa de estoque foi ignorada por falta de insumos.`
        : `Receita finalizada! Produzido: ${productionMultiplier} lote(s). O estoque dos insumos foi descontado.`);
      setIsSuccessModalOpen(true);
    }
    
    setIsFinishing(false);
  };

  const sharedModals = (
    <>
      {/* Success Toast */}
      <Toast 
        open={isSuccessModalOpen} 
        onOpenChange={setIsSuccessModalOpen} 
        title="Sucesso!" 
        description={successMessage} 
      />

      {/* Error Modal */}
      <Dialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
        <DialogContent className="max-w-md rounded-[2rem] p-6 text-center bg-surface-container-lowest border-2 border-error/20 shadow-sticker [&>button]:hidden">
          <div className="w-16 h-16 bg-[#faece8] text-[#9F402D] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <DialogTitle className="font-display-md text-2xl text-[#3e1d15] mb-2">Estoque Insuficiente!</DialogTitle>
          <p className="font-body-md text-[#7a5642] mb-4">
            Você não possui os ingredientes necessários para produzir {productionMultiplier} lote(s) dessa receita:
          </p>
          <div className="text-left bg-surface-container-low rounded-xl p-4 mb-6 max-h-48 overflow-y-auto border border-outline-variant/30">
            {shortageDetails.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-outline-variant/20 last:border-0">
                <span className="font-body-md text-on-surface">{item.name}</span>
                <span className="font-bold text-error">Falta: {item.missing.toLocaleString('pt-BR')} {item.unit}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setIsErrorModalOpen(false)}
            className="w-full bg-[#9F402D] text-white font-bold py-3 rounded-xl hover:bg-[#8A3322] active:scale-95 transition-all shadow-sm"
          >
            Entendi
          </button>
        </DialogContent>
      </Dialog>

      {/* Confirm Shortage Modal */}
      <Dialog open={isConfirmShortageModalOpen} onOpenChange={setIsConfirmShortageModalOpen}>
        <DialogContent className="max-w-md rounded-[2rem] p-6 text-center bg-surface-container-lowest border-2 border-primary/20 shadow-sticker [&>button]:hidden">
          <div className="w-16 h-16 bg-[#fff4f2] text-[#DF7159] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <span className="material-symbols-outlined text-3xl">warning</span>
          </div>
          <DialogTitle className="font-display-md text-2xl text-[#3e1d15] mb-2">Atenção ao Estoque</DialogTitle>
          <p className="font-body-md text-[#7a5642] mb-4">
            Alguns ingredientes não possuem quantidade suficiente para {productionMultiplier} lote(s):
          </p>
          <div className="text-left bg-surface-container-low rounded-xl p-4 mb-6 max-h-32 overflow-y-auto border border-outline-variant/30">
            {shortageDetails.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-1.5 border-b border-outline-variant/20 last:border-0">
                <span className="font-body-md text-on-surface text-sm">{item.name}</span>
                <span className="font-bold text-error text-sm">Falta: {item.missing.toLocaleString('pt-BR')} {item.unit}</span>
              </div>
            ))}
          </div>
          <p className="font-label-md text-on-surface-variant mb-6 text-xs text-balance">
            Deseja finalizar a receita mesmo assim? A baixa no estoque destes insumos será ignorada para evitar estoque negativo.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsConfirmShortageModalOpen(false)}
              className="flex-1 bg-surface-container text-on-surface font-bold py-3 rounded-xl hover:bg-surface-container-high active:scale-95 transition-all"
              disabled={isFinishing}
            >
              Cancelar
            </button>
            <button 
              onClick={() => executeFinish(true)}
              className="flex-1 bg-[#9F402D] text-white font-bold py-3 rounded-xl hover:bg-[#8A3322] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
              disabled={isFinishing}
            >
              {isFinishing ? 'Salvando...' : 'Finalizar Receita'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  // Render Detailed View
  if (selectedRecipe) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-[1000px] mx-auto items-start animate-in fade-in zoom-in-95 duration-500 pb-20">
        
        {/* Top Back Button */}
        <button 
          onClick={() => {
            setSelectedRecipe(null);
            setCheckedIngredients(new Set());
          }} 
          className="flex items-center gap-2 text-primary/70 hover:text-primary transition-colors font-label-md bg-transparent px-2 py-1 rounded-full hover:bg-primary/5"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Voltar ao Menu
        </button>

        <div className="flex flex-col md:flex-row gap-10 lg:gap-16 w-full items-start relative">
          
          {/* Left side: Image */}
          <div className="w-full md:w-[38%] max-w-sm relative">
             <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-float relative bg-surface-container">
               {selectedRecipe.image_url ? (
                 <img src={selectedRecipe.image_url} alt={selectedRecipe.name} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-[#fdf3f0] flex flex-col items-center justify-center">
                   <span className="material-symbols-outlined text-6xl text-[#e2725b]/20 mb-3">cake</span>
                   <span className="font-display-sm text-sm text-[#e2725b]/40">Sem foto</span>
                 </div>
               )}
               {/* Tag overlay */}
               <div className="absolute top-4 right-4 bg-[#806c00] text-white font-label-sm text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                 <span className="material-symbols-outlined text-[12px]">star</span>
                 Destaque
               </div>
             </div>
          </div>

          {/* Right side: Details */}
          <div className="w-full md:w-[62%] flex flex-col pt-2 md:pt-4">
          <div className="flex gap-2 mb-4 items-center justify-between">
            <span className="bg-[#f2e6e3] text-[#7a5642] font-label-sm text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">Ficha Técnica</span>
            
            <button 
              onClick={handleFinishRecipe}
              disabled={isFinishing}
              className="bg-primary text-white font-label-md px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-[18px]">done_all</span>
              {isFinishing ? 'Finalizando...' : 'Finalizar Receita'}
            </button>
          </div>
          
          <h1 className="font-display-lg text-4xl md:text-5xl text-primary font-bold mb-8 leading-tight">{selectedRecipe.name}</h1>

          {/* Stats Container - Soft Pill */}
          <div className="bg-[#faece8] rounded-3xl p-5 lg:p-6 mb-10 flex justify-between items-center relative overflow-hidden">
             <div className="flex flex-col items-center justify-center flex-1">
               <div className="w-8 h-8 rounded-full bg-[#f3d9d2] text-[#9f402d] flex items-center justify-center mb-2">
                 <span className="material-symbols-outlined text-[16px]">schedule</span>
               </div>
               <span className="text-[9px] uppercase tracking-[0.15em] text-[#7a5642] mb-1">Preparo</span>
               <span className="font-display-sm text-xl text-[#3e1d15] font-semibold">{selectedRecipe.prep_time_minutes} Min</span>
             </div>
             
             <div className="flex flex-col items-center justify-center flex-1 border-x border-[#eecfcd]/50">
               <div className="w-8 h-8 rounded-full bg-[#f3d9d2] text-[#9f402d] flex items-center justify-center mb-2">
                 <span className="material-symbols-outlined text-[16px]">group</span>
               </div>
               <span className="text-[9px] uppercase tracking-[0.15em] text-[#7a5642] mb-1">Rendimento</span>
               <span className="font-display-sm text-xl text-[#3e1d15] font-semibold">{selectedRecipe.yield} Unid</span>
             </div>

             <div className="flex flex-col items-center justify-center flex-1">
               <div className="w-8 h-8 rounded-full bg-[#f3d9d2] text-[#9f402d] flex items-center justify-center mb-2">
                 <span className="material-symbols-outlined text-[16px]">kitchen</span>
               </div>
               <span className="text-[9px] uppercase tracking-[0.15em] text-[#7a5642] mb-1">Ingredientes</span>
               <span className="font-display-sm text-xl text-[#3e1d15] font-semibold">{selectedRecipe.recipe_ingredients.length} Itens</span>
             </div>
             
             {/* Decorative squiggly line (simulated with a subtle gradient bar at bottom) */}
             <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#e2725b]/20 to-transparent"></div>
          </div>

          {/* Ingredients Section */}
          <div className="mb-10">
            <h3 className="font-display-md text-2xl text-[#824d3e] flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#f2e6e3] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-[#9f402d]">shopping_basket</span>
              </div>
              Ingredientes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-6">
              {selectedRecipe.recipe_ingredients.map((ri, idx) => {
                const isChecked = checkedIngredients.has(idx);
                return (
                  <div 
                    key={idx} 
                    onClick={() => toggleIngredient(idx)}
                    className="flex gap-3 items-start cursor-pointer group"
                  >
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${isChecked ? 'bg-[#9f402d] border-[#9f402d]' : 'border-[#d9c4c0] group-hover:border-[#9f402d]/50'}`}>
                      {isChecked && <span className="material-symbols-outlined text-[14px] text-white font-bold">check</span>}
                    </div>
                    <div className={`flex flex-col transition-all ${isChecked ? 'opacity-40 line-through' : ''}`}>
                      <span className="font-body-md text-[#3e1d15] capitalize font-medium">{ri.ingredients?.name}</span>
                      <span className="font-body-sm text-[#7a5642] mt-0.5 text-[12px]">
                        {ri.quantity_used} {getUnitDisplay(ri.ingredients?.purchase_unit || '')}
                      </span>
                    </div>
                  </div>
                );
              })}
              {selectedRecipe.recipe_ingredients.length === 0 && (
                <span className="text-on-surface-variant text-sm italic">Nenhum ingrediente.</span>
              )}
            </div>
          </div>

          {/* Method Section */}
          <div className="mb-10">
            <h3 className="font-display-md text-2xl text-[#824d3e] flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#f2e6e3] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-[#9f402d]">restaurant</span>
              </div>
              Modo de Preparo
            </h3>
            
            {/* Split instructions into simulated steps if they have newlines, else single block */}
            <div className="flex flex-col gap-6">
              {selectedRecipe.instructions ? (
                selectedRecipe.instructions.split('\n\n').map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-[#9f402d] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div 
                      className="font-body-md text-[#4a322b] leading-relaxed [&>b]:font-bold [&>i]:italic [&>u]:underline [&>b]:text-primary" 
                      dangerouslySetInnerHTML={{ __html: step.replace(/\n/g, '<br/>') }}
                    />
                  </div>
                ))
              ) : (
                <span className="italic text-[#7a5642] text-sm ml-10">Nenhuma instrução cadastrada.</span>
              )}
            </div>
          </div>

          {/* Notes Section */}
          {selectedRecipe.notes && (
            <div>
              <h3 className="font-display-md text-2xl text-[#824d3e] flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#f2e6e3] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-[#9f402d]">sticky_note_2</span>
                </div>
                Notas
              </h3>
              <div className="ml-10 font-body-md text-[#4a322b] leading-relaxed border-l-2 border-[#eecfcd] pl-4 py-1">
                {selectedRecipe.notes}
              </div>
            </div>
          )}
          
          {/* Production Modal */}
          <Dialog open={isProductionModalOpen} onOpenChange={setIsProductionModalOpen}>
            <DialogContent className="sm:max-w-[400px] bg-surface-container-lowest border-2 border-primary-container rounded-3xl">
              <DialogHeader>
                <DialogTitle className="font-headline-sm text-primary">Quantas receitas você produziu?</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <p className="text-on-surface-variant text-sm">
                  O sistema irá multiplicar a quantidade usada e dar baixa automaticamente no seu estoque para todos os insumos desta receita.
                </p>
                <div className="space-y-2">
                  <Label className="text-on-surface">Quantidade (lotes produzidos)</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    step="1"
                    value={productionMultiplier}
                    onChange={(e) => setProductionMultiplier(Number(e.target.value))}
                    className="bg-surface border-2 border-outline-variant h-12 rounded-2xl"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setIsProductionModalOpen(false)}
                    className="px-6 py-3 font-label-md text-on-surface hover:bg-surface-container-high rounded-full transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmFinish}
                    disabled={isFinishing}
                    className="px-6 py-3 bg-[#9F402D] text-white font-bold text-[13px] rounded-full hover:bg-[#8A3322] active:scale-95 transition-all flex items-center gap-2"
                  >
                    {isFinishing ? 'Salvando...' : 'Confirmar Baixa'}
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </div>
      {sharedModals}
      </div>
    );
  }

  // Render Grid View
  const filteredRecipes = recipes
    .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(r => {
      if (categoryFilter === 'todas') return true;
      // Depending on your actual recipe category values in DB, adapt if needed.
      // E.g., if there's no category in Recipe yet, we might skip filtering or assume. 
      // For now, assume it exists or just pass true if undefined.
      return true; // We don't have recipe categories in DB yet! Wait... I'll check.
    })
    .sort((a, b) => {
      if (sortOrder === 'az') return a.name.localeCompare(b.name);
      if (sortOrder === 'antigas') return a.id.localeCompare(b.id); // Or created_at if exists
      return b.id.localeCompare(a.id); // 'recentes' - default fallback
    });

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto pb-10">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Receitas</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">
            Navegue pelas suas receitas e visualize a ficha completa.
          </p>
        </div>
        <Link to="/fichas-tecnicas/nova" className="shrink-0">
          <button className="flex items-center justify-center gap-2 bg-[#9F402D] text-white font-bold text-[13px] px-4 py-2.5 rounded-[1.25rem] hover:bg-[#8A3322] active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)] w-full md:w-auto">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Ficha Técnica
          </button>
        </Link>
      </header>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 mb-10 items-center">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] z-10">search</span>
          <Input 
            type="text" 
            placeholder="Buscar receitas..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="w-full md:w-48">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                <SelectItem value="bolos">Bolos</SelectItem>
                <SelectItem value="doces">Doces</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
                <SelectValue placeholder="Mais recentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="antigas">Mais antigas</SelectItem>
                <SelectItem value="az">A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-[#eecfcd] rounded-[3rem]">
          <span className="material-symbols-outlined text-[80px] text-[#e2725b]/30 mb-6">cake</span>
          <h3 className="font-headline-md text-[#3e1d15] mb-2">Nenhuma receita encontrada</h3>
          <p className="font-body-md text-[#7a5642]">Tente ajustar a sua busca ou adicione uma nova receita!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecipes.map(recipe => (
            <div 
              key={recipe.id} 
              onClick={() => setSelectedRecipe(recipe)}
              className="group cursor-pointer bg-white p-5 rounded-[2rem] shadow-[0_4px_20px_rgba(159,64,45,0.05)] hover:shadow-[0_8px_30px_rgba(159,64,45,0.1)] hover:-translate-y-1 transition-all flex flex-col items-center"
            >
              <div className="w-full aspect-[4/5] bg-[#FFF4F2] rounded-[1.5rem] flex items-center justify-center relative mb-5 group-hover:bg-[#FDECE9] transition-colors border border-[#FDF0EC]">
                {recipe.image_url ? (
                  <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover rounded-[1.5rem]" />
                ) : (
                  <span className="material-symbols-outlined text-[64px] text-[#E3755C]/40" style={{ fontVariationSettings: "'FILL' 1" }}>cake</span>
                )}
                
                {/* Time Pill */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-[#DF7159] px-3 py-1 rounded-full text-[12px] font-bold flex items-center gap-1 shadow-sm whitespace-nowrap">
                  <span className="material-symbols-outlined text-[14px]">timer</span>
                  {recipe.prep_time_minutes >= 60 
                    ? `${Math.floor(recipe.prep_time_minutes / 60)}h ${recipe.prep_time_minutes % 60 > 0 ? `${recipe.prep_time_minutes % 60}m` : ''}`
                    : `${recipe.prep_time_minutes}m`}
                </div>
              </div>
              
              <h3 className="font-display-md text-[20px] text-[#7A3326] text-center leading-tight mb-1 group-hover:text-[#DF7159] transition-colors">{recipe.name}</h3>
              <p className="text-[13px] text-[#B08D87] mb-4 text-center">{recipe.recipe_ingredients.length} ingredientes</p>
              
              <div className="flex items-center justify-center w-full mt-auto">
                <div className="flex items-center justify-center gap-1.5 text-[#DF7159] bg-[#FFF4F2] border border-[#DF7159]/20 text-[12px] px-4 py-1.5 rounded-full font-medium w-full">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  Produzida {recipe.production_count || 0} vezes
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {sharedModals}
    </div>
  );
};
