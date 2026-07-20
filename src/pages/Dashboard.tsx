import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [stats, setStats] = useState({ ingredients: 0, recipes: 0, pricings: 0, lowStock: 0 });
  const [recentRecipes, setRecentRecipes] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      const { count: ingCount } = await supabase
        .from('ingredients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      const { data: allIngredients } = await supabase
        .from('ingredients')
        .select('current_stock, min_stock_limit')
        .eq('user_id', user.id)
        .is('deleted_at', null);
      
      const lowStockCount = allIngredients?.filter(i => {
        const min = Number(i.min_stock_limit);
        return min > 0 && Number(i.current_stock) <= min;
      }).length || 0;

      const { count: recCount } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: pricingsCount } = await supabase
        .from('pricings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        ingredients: ingCount || 0,
        recipes: recCount || 0,
        pricings: pricingsCount || 0,
        lowStock: lowStockCount
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Card 1: Receitas Cadastradas */}
        <Link to="/receitas" className="block outline-none">
          <div className="bg-white p-4 lg:p-5 rounded-[1.5rem] flex items-center gap-4 hover:-translate-y-1 transition-transform shadow-[0_4px_20px_rgba(159,64,45,0.05)] cursor-pointer">
            <div className="w-12 h-12 shrink-0 rounded-full bg-[#F8E4E0] flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">menu_book</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-display-lg text-[24px] text-on-surface leading-none mb-1">{stats.recipes}</h3>
              <p className="font-label-md text-[11px] text-[#87655F] leading-tight">Receitas<br/>Cadastradas</p>
            </div>
          </div>
        </Link>

        {/* Card 2: Ingredientes Cadastrados */}
        <Link to="/inventario" className="block outline-none">
          <div className="bg-white p-4 lg:p-5 rounded-[1.5rem] flex items-center gap-4 hover:-translate-y-1 transition-transform shadow-[0_4px_20px_rgba(159,64,45,0.05)] cursor-pointer">
            <div className="w-12 h-12 shrink-0 rounded-full bg-[#FAEDCD] flex items-center justify-center text-[#A9A450]">
              <span className="material-symbols-outlined text-[24px]">kitchen</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-display-lg text-[24px] text-on-surface leading-none mb-1">{stats.ingredients}</h3>
              <p className="font-label-md text-[11px] text-[#87655F] leading-tight">Ingredientes<br/>Cadastrados</p>
            </div>
          </div>
        </Link>

        {/* Card 3: Precificações Realizadas */}
        <Link to="/precificacao" className="block outline-none">
          <div className="bg-white p-4 lg:p-5 rounded-[1.5rem] flex items-center gap-4 hover:-translate-y-1 transition-transform shadow-[0_4px_20px_rgba(159,64,45,0.05)] cursor-pointer">
            <div className="w-12 h-12 shrink-0 rounded-full bg-[#E8F3EC] flex items-center justify-center text-[#2E6D3D]">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
            <div className="flex flex-col">
              <h3 className="font-display-lg text-[24px] text-on-surface leading-none mb-1">{stats.pricings}</h3>
              <p className="font-label-md text-[11px] text-[#87655F] leading-tight">Precificações<br/>Realizadas</p>
            </div>
          </div>
        </Link>

        {/* Card 4: Estoque Baixo */}
        <Link to="/inventario" className="block outline-none">
          <div className={`p-4 lg:p-5 rounded-[1.5rem] flex items-center gap-4 hover:-translate-y-1 transition-transform cursor-pointer ${stats.lowStock > 0 ? 'bg-[#DF7159] shadow-[0_8px_24px_rgba(223,113,89,0.3)]' : 'bg-white shadow-[0_4px_20px_rgba(159,64,45,0.05)]'}`}>
            <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${stats.lowStock > 0 ? 'bg-white text-[#DF7159]' : 'bg-[#F2F0F4] text-[#A39CA9]'}`}>
              <span className="material-symbols-outlined text-[24px]" style={stats.lowStock > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {stats.lowStock > 0 ? 'warning' : 'inventory_2'}
              </span>
            </div>
            <div className="flex flex-col">
              <h3 className={`font-display-lg text-[24px] leading-none mb-1 ${stats.lowStock > 0 ? 'text-white' : 'text-on-surface'}`}>{stats.lowStock}</h3>
              <p className={`font-label-md text-[11px] leading-tight ${stats.lowStock > 0 ? 'text-[#F9D5CE]' : 'text-[#87655F]'}`}>
                {stats.lowStock === 1 ? 'Item com' : 'Itens com'}<br/>Estoque Baixo
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Recipes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Fichas Técnicas Recentes */}
        <div className="bg-white p-5 rounded-[1.5rem] shadow-[0_4px_20px_rgba(159,64,45,0.05)] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display-lg text-[18px] text-on-surface">Fichas Técnicas Recentes</h3>
            <Link to="/fichas-tecnicas" className="text-[#DF7159] font-bold text-[12px] hover:underline">
              Ver Todas
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentRecipes.length === 0 ? (
              <p className="col-span-full text-on-surface-variant font-body-md py-6 text-center">
                Nenhuma ficha técnica criada.
              </p>
            ) : (
              recentRecipes.slice(0, 4).map(recipe => (
                <Link to={`/fichas-tecnicas/${recipe.id}`} key={recipe.id} className="block group">
                  <div className="bg-[#FFF4F2] border-2 border-dashed border-[#EBB6AB] rounded-2xl overflow-hidden h-28 relative flex flex-col items-center justify-center transition-all group-hover:bg-[#FDECE9] group-hover:border-[#E3755C]">
                    <span className="material-symbols-outlined text-2xl mb-1.5 text-[#B3523F]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                    <h4 className="font-label-md text-[12px] text-center px-4 truncate w-full text-[#5A281E]" title={recipe.name}>
                      {recipe.name}
                    </h4>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Receitas Recentes */}
        <div className="bg-white p-5 rounded-[1.5rem] shadow-[0_4px_20px_rgba(159,64,45,0.05)] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display-lg text-[18px] text-on-surface">Receitas Recentes</h3>
            <Link to="/receitas" className="text-[#DF7159] font-bold text-[12px] hover:underline">
              Ver Todas
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentRecipes.length === 0 ? (
              <p className="col-span-full text-on-surface-variant font-body-md py-6 text-center">
                Nenhuma receita criada ainda.
              </p>
            ) : (
              recentRecipes.slice(0, 4).map(recipe => (
                <Link to={`/receitas`} key={`rec-${recipe.id}`} className="block group">
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
      </div>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {fabOpen && (
          <div className="flex flex-col gap-2 mb-2 items-end">
            <Link to="/receitas/nova" className="flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:scale-105 transition-all text-on-surface">
              <span className="font-bold text-[14px]">Nova Receita</span>
              <div className="w-8 h-8 rounded-full bg-[#DF7159] flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[16px]">cake</span>
              </div>
            </Link>
            <Link to="/fichas-tecnicas/nova" className="flex items-center gap-3 bg-white px-5 py-3 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:scale-105 transition-all text-on-surface">
              <span className="font-bold text-[14px]">Nova Ficha Técnica</span>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
              </div>
            </Link>
          </div>
        )}
        <button 
          onClick={() => setFabOpen(!fabOpen)}
          className={`w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_8px_24px_rgba(159,64,45,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 ${fabOpen ? 'rotate-45 bg-[#8A3322]' : ''}`}
        >
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      </div>
    </div>
  );
};

