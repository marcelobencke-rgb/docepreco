import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ ingredients: 0, recipes: 0 });
  const [recentRecipes, setRecentRecipes] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      const { count: ingCount } = await supabase
        .from('ingredients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: recCount } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        ingredients: ingCount || 0,
        recipes: recCount || 0,
      });

      const { data: recent } = await supabase
        .from('recipes')
        .select('id, name, yield, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (recent) setRecentRecipes(recent);
      
      setLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando painel...</div>;

  return (
    <div className="flex flex-col w-full">
      {/* Greeting Section */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Olá, Confeiteira! ✨</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">Veja como está o seu ateliê hoje.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 rounded-full bg-[#FDF0EC] flex items-center justify-center text-primary hover:bg-[#F8E4E0] transition-all">
            <span className="material-symbols-outlined text-[18px]">notifications</span>
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#7A3326] text-white flex items-center justify-center font-bold text-[13px]">
            DP
          </div>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total de Ingredientes */}
        <div className="bg-white p-4 rounded-[1.5rem] flex flex-col justify-between hover:-translate-y-1 transition-transform aspect-[1.3] shadow-[0_4px_20px_rgba(159,64,45,0.05)]">
          <div className="flex justify-between items-start mb-2">
            <div className="w-8 h-8 rounded-full bg-[#A9A450] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[18px]">kitchen</span>
            </div>
          </div>
          <div>
            <p className="font-label-md text-[11px] text-[#87655F] mb-1">Ingredientes</p>
            <h3 className="font-display-lg text-[22px] text-on-surface leading-none">{stats.ingredients}</h3>
          </div>
        </div>

        {/* Card 2: Fichas Técnicas */}
        <div className="bg-white p-4 rounded-[1.5rem] flex flex-col justify-between hover:-translate-y-1 transition-transform aspect-[1.3] shadow-[0_4px_20px_rgba(159,64,45,0.05)]">
          <div className="flex justify-between items-start mb-2">
            <div className="w-8 h-8 rounded-full bg-[#F8E4E0] flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
            </div>
          </div>
          <div>
            <p className="font-label-md text-[11px] text-[#87655F] mb-1">Receitas</p>
            <h3 className="font-display-lg text-[22px] text-on-surface leading-none">{stats.recipes}</h3>
          </div>
        </div>

        {/* Card 3: Precificação Rápida */}
        <div className="bg-white p-4 rounded-[1.5rem] flex flex-col justify-between hover:-translate-y-1 transition-transform aspect-[1.3] shadow-[0_4px_20px_rgba(159,64,45,0.05)] cursor-pointer">
          <div className="flex justify-between items-start mb-2">
            <div className="w-8 h-8 rounded-full bg-[#F8E4E0] flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div>
            <p className="font-label-md text-[11px] text-[#87655F] mb-1">Precificação</p>
            <h3 className="font-display-lg text-[16px] text-on-surface leading-tight">Calculadora</h3>
          </div>
        </div>

        {/* Card 4: Dicas */}
        <div className="bg-[#DF7159] p-4 rounded-[1.5rem] flex flex-col justify-between hover:-translate-y-1 transition-transform aspect-[1.3] shadow-[0_8px_24px_rgba(223,113,89,0.3)]">
          <div className="flex justify-between items-start mb-2">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#DF7159]">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>lightbulb</span>
            </div>
            <span className="bg-white text-[#DF7159] px-2 py-0.5 rounded-full font-bold text-[10px]">Novo</span>
          </div>
          <div>
            <p className="font-label-md text-[11px] text-[#F9D5CE] mb-1">Dica do Dia</p>
            <h3 className="font-display-lg text-[16px] text-white leading-tight">Revise os Custos</h3>
          </div>
        </div>
      </div>

      {/* Recent Recipes */}
      <div className="bg-white p-5 rounded-[1.5rem] shadow-[0_4px_20px_rgba(159,64,45,0.05)] mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display-lg text-[18px] text-on-surface">Fichas Técnicas Recentes</h3>
          <Link to="/fichas-tecnicas" className="text-[#DF7159] font-bold text-[12px] hover:underline">
            Ver Todas
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentRecipes.length === 0 ? (
            <p className="col-span-full text-on-surface-variant font-body-md py-6 text-center">
              Nenhuma receita criada ainda. Que tal criar a primeira?
            </p>
          ) : (
            recentRecipes.map(recipe => (
              <Link to={`/fichas-tecnicas/${recipe.id}`} key={recipe.id} className="block group">
                <div className="bg-[#FFF4F2] border-2 border-dashed border-[#EBB6AB] rounded-2xl overflow-hidden h-28 relative flex flex-col items-center justify-center transition-all group-hover:bg-[#FDECE9] group-hover:border-[#E3755C]">
                  <span className="material-symbols-outlined text-2xl mb-1.5 text-[#B3523F]" style={{ fontVariationSettings: "'FILL' 1" }}>cake</span>
                  <h4 className="font-label-md text-[12px] text-center px-4 truncate w-full text-[#5A281E]" title={recipe.name}>
                    {recipe.name}
                  </h4>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mt-auto">
        <Link to="/ingredientes" className="flex-1">
          <button className="w-full bg-[#F5DE6A] text-[#3D2C00] font-bold text-[13px] py-3 rounded-[1.25rem] shadow-[0_8px_24px_rgba(245,222,106,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>kitchen</span>
            + Novo Ingrediente
          </button>
        </Link>
        <Link to="/fichas-tecnicas/nova" className="flex-1">
          <button className="w-full bg-[#9F402D] text-white font-bold text-[13px] py-3 rounded-[1.25rem] shadow-[0_8px_24px_rgba(159,64,45,0.3)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
            + Criar Ficha Técnica
          </button>
        </Link>
      </div>
    </div>
  );
};

