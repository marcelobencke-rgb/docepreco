import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
      name: string;
      purchase_unit: string;
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

  useEffect(() => {
    const fetchRecipes = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients(
            quantity_used,
            ingredients(name, purchase_unit)
          )
        `)
        .eq('user_id', user.id)
        .order('name');
      
      if (data) setRecipes(data as any);
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

  const handleFinishRecipe = async () => {
    if (!selectedRecipe || !user) return;
    setIsFinishing(true);
    
    const newCount = (selectedRecipe.production_count || 0) + 1;
    
    const { error } = await supabase
      .from('recipes')
      .update({ production_count: newCount })
      .eq('id', selectedRecipe.id);
      
    if (!error) {
      // Update local state
      const updatedRecipe = { ...selectedRecipe, production_count: newCount };
      setSelectedRecipe(updatedRecipe);
      setRecipes(recipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
      setCheckedIngredients(new Set<number>());
      // Small feedback using standard browser alert (could be replaced with a toast)
      alert('Receita finalizada com sucesso! Bom trabalho.');
      // Return to the previous screen
      setSelectedRecipe(null);
    }
    
    setIsFinishing(false);
  };

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
                    <div className="font-body-md text-[#4a322b] leading-relaxed">
                      {step}
                    </div>
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

        </div>
        </div>
      </div>
    );
  }

  // Render Grid View
  const filteredRecipes = recipes.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 mt-4 gap-6">
        <div>
          <h1 className="font-display-lg text-[48px] text-[#DF7159] font-bold mb-2">Cardápio</h1>
          <p className="font-body-lg text-[#87655F] max-w-2xl text-[16px]">
            Navegue pelas suas receitas. Clique em qualquer uma para visualizar a ficha completa de forma elegante.
          </p>
        </div>
        <Link to="/fichas-tecnicas/nova">
          <button className="bg-[#DF7159] text-white font-bold px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_4px_12px_rgba(223,113,89,0.3)] shrink-0 w-full md:w-auto">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Receita
          </button>
        </Link>
      </header>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 mb-10 items-center">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#DF7159] text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Buscar receitas..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-full bg-white border border-[#FDF0EC] text-[#87655F] focus:outline-none focus:ring-2 focus:ring-[#DF7159]/20 shadow-sm font-body-md"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-auto">
            <select className="w-full appearance-none bg-white border border-[#FDF0EC] text-[#87655F] pl-6 pr-10 py-3 rounded-full shadow-sm font-body-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DF7159]/20">
              <option>Todas as categorias</option>
              <option>Bolos</option>
              <option>Doces</option>
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#87655F] pointer-events-none text-[20px]">expand_more</span>
          </div>
          <div className="relative w-full md:w-auto">
            <select className="w-full appearance-none bg-white border border-[#FDF0EC] text-[#87655F] pl-6 pr-10 py-3 rounded-full shadow-sm font-body-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DF7159]/20">
              <option>Mais recentes</option>
              <option>Mais antigas</option>
              <option>A-Z</option>
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#87655F] pointer-events-none text-[20px]">expand_more</span>
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
    </div>
  );
};
