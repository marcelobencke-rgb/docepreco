import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIngredients, isLowStock, type Ingredient } from '@/hooks/useIngredients';

const NotificationBell = ({
  items,
  variant,
}: {
  items: Ingredient[];
  variant: 'nav' | 'icon';
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropdown = (
    <div className={`absolute top-full ${variant === 'nav' ? 'left-0' : 'right-0'} mt-2 w-72 bg-surface-container-lowest border-2 border-outline-variant/50 rounded-2xl shadow-sticker z-[100] max-h-80 overflow-y-auto p-2`}>
      <p className="px-2 py-1.5 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">Estoque baixo</p>
      {items.length === 0 ? (
        <p className="px-2 py-4 text-center text-[13px] text-on-surface-variant">Tudo certo por aqui! 🎉</p>
      ) : (
        items.map((ing) => (
          <Link
            key={ing.id}
            to="/inventario"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl hover:bg-error-container/40 transition-colors"
          >
            <span className="text-[13px] font-medium text-on-surface truncate">{ing.name}</span>
            <span className="text-[11px] text-error font-bold whitespace-nowrap">
              {Number(ing.current_stock).toLocaleString('pt-BR')} / {Number(ing.min_stock_limit).toLocaleString('pt-BR')}
            </span>
          </Link>
        ))
      )}
    </div>
  );

  if (variant === 'nav') {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-[1.5rem] font-bold transition-all duration-150 active:scale-95 text-on-surface-variant hover:bg-surface-container-high/50 hover:scale-[1.02]"
        >
          <span className="material-symbols-outlined text-[18px] relative">
            notifications
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-error text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {items.length > 9 ? '9+' : items.length}
              </span>
            )}
          </span>
          <span className="text-[13px]">Estoque baixo</span>
        </button>
        {open && dropdown}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-on-surface-variant flex items-center p-2 rounded-full hover:bg-surface-container-high"
      >
        <span className="material-symbols-outlined">notifications</span>
        {items.length > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-error text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {items.length > 9 ? '9+' : items.length}
          </span>
        )}
      </button>
      {open && dropdown}
    </div>
  );
};

export const Layout = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { ingredients } = useIngredients();
  const lowStockIngredients = ingredients.filter(isLowStock);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard' },
    { name: 'Fornecedores', path: '/fornecedores', icon: 'storefront' },
    { name: 'Inventário', path: '/inventario', icon: 'inventory_2' },
    { name: 'Compras', path: '/compras', icon: 'shopping_cart' },
    { name: 'Receitas', path: '/receitas', icon: 'cake' },
    { name: 'Fichas Técnicas', path: '/fichas-tecnicas', icon: 'menu_book' },
    { name: 'Precificação', path: '/precificacao', icon: 'payments' },
    { name: 'Caixa', path: '/caixa', icon: 'account_balance_wallet' },
    { name: 'Configurações', path: '/configuracoes', icon: 'settings' },
  ];

  return (
    <div className="flex min-h-screen text-on-surface font-body-md antialiased selection:bg-primary-container selection:text-on-primary-container">

      {/* Side Navigation Shell for Desktop */}
      <nav className="hidden md:flex flex-col p-4 fixed left-0 top-0 h-full w-48 z-50 bg-surface border-r border-surface shadow-[4px_0_24px_rgba(232,122,140,0.05)]">
        <div className="mb-8 text-center pt-4">
          <Link to="/" className="block cursor-pointer hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Docepreço Logo" className="w-32 h-auto mx-auto" />
            <p className="font-label-md text-[11px] text-on-surface-variant mt-1.5 font-medium">Seu Ateliê</p>
          </Link>
        </div>

        <ul className="flex flex-col gap-1 flex-grow">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-[1.5rem] font-bold transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high/50 hover:scale-[1.02]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                  <span className="text-[13px]">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-6 pb-2 flex flex-col gap-1">
          <NotificationBell items={lowStockIngredients} variant="nav" />
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-[1.5rem] text-primary hover:bg-surface-container-high/50 transition-all hover:scale-[1.02] active:scale-95 duration-150 font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="text-[13px]">Sair</span>
          </button>
        </div>
      </nav>

      {/* Top Bar for Mobile */}
      <header className="fixed top-0 inset-x-0 z-50 flex h-16 items-center justify-between border-b border-surface-variant bg-surface px-4 md:hidden shadow-sm">
        <Link to="/" className="flex items-center gap-2 cursor-pointer active:opacity-80">
          <img src="/logo.png" alt="Docepreço Logo" className="w-8 h-auto" />
          <h1 className="text-xl font-display-lg text-primary font-bold">Docepreço</h1>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell items={lowStockIngredients} variant="icon" />
          <button onClick={signOut} className="text-error flex items-center p-2 rounded-full hover:bg-error-container">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 p-4 pt-24 pb-16 md:p-6 md:ml-48 max-w-container-max mx-auto w-full relative min-h-screen">
        {/* Decorative Background Blobs - reduced opacity since we have a global gradient now */}
        <div className="fixed top-[5%] right-[5%] w-[500px] h-[500px] bg-primary/5 opacity-[0.03] blob-bg z-0 pointer-events-none"></div>
        <div className="fixed bottom-[-10%] left-[25%] w-[600px] h-[400px] bg-tertiary/10 opacity-[0.04] blob-bg z-0 pointer-events-none"></div>

        <div className="relative z-10 h-full w-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-surface-variant bg-surface md:hidden shadow-[0px_-4px_10px_rgba(232,122,140,0.1)] px-1">
        {navItems.filter(item => item.path !== '/' && item.path !== '/configuracoes').map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-center transition-all active:scale-95 flex-1 h-full ${
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title={item.name}
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${isActive ? 'bg-primary-container text-on-primary-container' : ''}`}>
                <span className="material-symbols-outlined text-[24px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {item.icon}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
