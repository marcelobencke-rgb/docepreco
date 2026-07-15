import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Recipe = {
  id: string;
  name: string;
  yield: number;
  prep_time_minutes: number;
};

export const Recipes = () => {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setRecipes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipes();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ficha técnica? Os preços salvos associados também podem ser afetados.')) return;
    await supabase.from('recipes').delete().eq('id', id);
    fetchRecipes();
  };

  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando fichas técnicas...</div>;

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header Section */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Minhas Fichas Técnicas</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">
            Acompanhe suas criações e monitore o custo dos ingredientes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/fichas-tecnicas/nova">
            <button className="flex items-center justify-center gap-2 bg-[#9F402D] text-white font-bold text-[13px] px-4 py-2.5 rounded-[1.25rem] hover:bg-[#8A3322] active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)]">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Nova Ficha Técnica
            </button>
          </Link>
        </div>
      </header>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-sm mb-lg">
        <button className="bg-primary text-on-primary font-label-md text-label-md px-5 py-2.5 rounded-full shadow-sticker transition-transform active:scale-95 border-2 border-transparent">
          Todas
        </button>
        <button className="bg-surface-container text-on-surface font-label-md text-label-md px-5 py-2.5 rounded-full hover:bg-surface-container-high transition-colors active:scale-95 border-2 border-surface-container-highest">
          Bolos
        </button>
        <button className="bg-surface-container text-on-surface font-label-md text-label-md px-5 py-2.5 rounded-full hover:bg-surface-container-high transition-colors active:scale-95 border-2 border-surface-container-highest">
          Docinhos
        </button>
      </div>

      {/* Recipe Grid (Bento/Card Style) */}
      {recipes.length === 0 ? (
        <div className="flex-1 bg-surface-container-lowest rounded-3xl border-2 border-surface-container flex flex-col items-center justify-center py-xl px-4 text-center shadow-sticker">
          <div className="w-20 h-20 bg-primary-container/20 rounded-full flex items-center justify-center mb-md text-primary">
            <span className="material-symbols-outlined text-5xl">menu_book</span>
          </div>
          <h3 className="font-headline-md text-on-surface mb-2">Seu caderno está vazio!</h3>
          <p className="font-body-md text-on-surface-variant max-w-md">
            Você ainda não criou nenhuma receita. Adicione sua primeira ficha técnica para ver a mágica acontecer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="group bg-surface-container-lowest rounded-2xl p-4 shadow-sticker hover:shadow-[0_12px_24px_rgba(159,64,45,0.2)] transition-all duration-300 hover:-translate-y-1 relative border-2 border-surface-container overflow-hidden flex flex-col cursor-pointer">
              
              <Link to={`/fichas-tecnicas/${recipe.id}`} className="relative h-48 rounded-xl overflow-hidden mb-4 bg-surface-container-low flex items-center justify-center group-hover:bg-primary-container/20 transition-colors">
                <span className="material-symbols-outlined text-6xl text-primary/30 group-hover:scale-110 transition-transform duration-500">cake</span>
                
                {/* Delete Button (absolute) */}
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(recipe.id); }}
                  className="absolute top-3 right-3 w-10 h-10 bg-surface-container-lowest/90 backdrop-blur-sm rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container shadow-sm hover:scale-110 active:scale-95 transition-all"
                  title="Excluir"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
                
                {/* Fake Margin Ribbon */}
                <div className="absolute bottom-3 left-3 bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">timer</span>
                  {recipe.prep_time_minutes} min
                </div>
              </Link>
              
              <Link to={`/fichas-tecnicas/${recipe.id}`} className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-2 pr-2 group-hover:text-primary transition-colors">{recipe.name}</h3>
                  <span className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2 py-1 rounded-full whitespace-nowrap">Doce</span>
                </div>
                
                <p className="font-body-md text-body-md text-on-surface-variant mb-4 line-clamp-2 mt-2">
                  Rendimento de {recipe.yield} porções perfeitas.
                </p>
                
                <div className="mt-auto pt-4 border-t-2 border-surface-container border-dashed flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Acessar</span>
                    <span className="font-headline-sm text-headline-sm text-primary group-hover:underline">Ficha Técnica</span>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 bg-primary-container text-on-primary-container rounded-full">
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

