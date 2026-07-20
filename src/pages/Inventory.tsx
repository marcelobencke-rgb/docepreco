import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';

import { IngredientDialog } from '@/components/IngredientDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Ingredient = {
  id: string;
  name: string;
  category: string;
  purchase_unit: string;
  purchase_quantity: number;
  purchase_price: number;
  base_unit_cost: number;
  current_stock: number;
  supplier_id: string | null;
  suppliers: { name: string } | null;
  recipe_ingredients?: { quantity_used: number, recipes: { name: string } }[];
};

export const Inventory = () => {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  
  // Stock Movement Modal State
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementIngredient, setMovementIngredient] = useState<Ingredient | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [movementQty, setMovementQty] = useState('');
  const [movementUnit, setMovementUnit] = useState('g');
  const [movementPrice, setMovementPrice] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierList, setSupplierList] = useState<{id: string, name: string}[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const [isSavingMovement, setIsSavingMovement] = useState(false);

  // Linked Recipes Modal State
  const [linkedRecipesModalOpen, setLinkedRecipesModalOpen] = useState(false);
  const [selectedLinkedRecipes, setSelectedLinkedRecipes] = useState<{quantity_used: number, recipes: {name: string}}[]>([]);
  const [selectedLinkedIngredientName, setSelectedLinkedIngredientName] = useState('');
  const [selectedLinkedIngredientUnit, setSelectedLinkedIngredientUnit] = useState('');

  // Tabs State
  const [activeTab, setActiveTab] = useState<'estoque' | 'movimentacoes'>('estoque');
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [sortOrder, setSortOrder] = useState('recentes');
  const [supplierFilter, setSupplierFilter] = useState('todos');

  const fetchIngredients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ingredients')
      .select('*, suppliers(name), recipe_ingredients(quantity_used, recipes(name))')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('name');
    if (data) setIngredients(data as any);
    setLoading(false);
  };

  const fetchSuppliers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');
    if (data) setSupplierList(data);
  };

  const fetchMovements = async () => {
    if (!user) return;
    setLoadingMovements(true);
    const { data } = await supabase
      .from('stock_movements')
      .select('*, ingredients(name, purchase_unit), suppliers(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMovements(data);
    setLoadingMovements(false);
  };

  useEffect(() => {
    fetchIngredients();
    fetchSuppliers();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab === 'movimentacoes') {
      fetchMovements();
    }
  }, [activeTab, user]);

  const getBaseUnitLabel = (unit: string) => {
    if (unit === 'kg' || unit === 'g') return 'g';
    if (unit === 'litro' || unit === 'ml') return 'ml';
    return 'un';
  };

  const translateReason = (reason: string) => {
    switch (reason) {
      case 'purchase': return 'Compra de Insumos';
      case 'recipe_production': return 'Produção de Receita';
      case 'manual': return 'Ajuste Manual';
      default: return 'Outros';
    }
  };

  const handleOpenDialog = (ingredient?: Ingredient) => {
    setEditingIngredient(ingredient || null);
    setIsDialogOpen(true);
  };

  const handleOpenMovement = (ingredient: Ingredient) => {
    setMovementIngredient(ingredient);
    setMovementType('in');
    setMovementQty('');
    setMovementPrice('');
    setSupplierSearch(ingredient.suppliers?.name || '');
    setSupplierId(ingredient.supplier_id || null);
    setMovementUnit(getBaseUnitLabel(ingredient.purchase_unit));
    setIsMovementOpen(true);
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !movementIngredient || !movementQty) return;
    
    setIsSavingMovement(true);
    let qty = parseFloat(movementQty);
    
    // Convert to base unit if necessary
    if (movementUnit === 'kg') qty *= 1000;
    if (movementUnit === 'litro') qty *= 1000;
    
    let finalSupplierId = supplierId;

    if (movementType === 'in') {
      if (!finalSupplierId && supplierSearch.trim()) {
        const { data: newSupplier } = await supabase
          .from('suppliers')
          .insert({ user_id: user.id, name: supplierSearch.trim() })
          .select()
          .single();
        if (newSupplier) finalSupplierId = newSupplier.id;
      } else if (!supplierSearch.trim()) {
        finalSupplierId = null;
      }
    }

    const price = movementType === 'in' ? parseCurrencyInput(movementPrice) : null;
    
    // Save to stock_movements
    await supabase.from('stock_movements').insert({
      ingredient_id: movementIngredient.id,
      user_id: user.id,
      type: movementType,
      quantity: qty,
      reason: movementType === 'in' ? 'purchase' : 'manual',
      price: price,
      supplier_id: movementType === 'in' ? finalSupplierId : null
    });
    
    // Update ingredients table
    const newStock = movementType === 'in' 
      ? Number(movementIngredient.current_stock) + qty 
      : Math.max(0, Number(movementIngredient.current_stock) - qty);
      
    let updateData: any = { current_stock: newStock };
    
    // Auto-update base_unit_cost based on this purchase price
    if (movementType === 'in' && price && price > 0) {
      let calcQty = qty;
      // Depending on how we calculate base unit: 
      // If the purchase is logged as e.g., 2 L for 10 BRL -> cost per L = 5 BRL
      // Then if base unit is ml, cost per ml = 5 / 1000 = 0.005 BRL.
      // Above, we already multiplied `qty` by 1000 if it was kg or litro. So qty is already in base units (g or ml).
      // So price / qty gives us exact price per base unit (g or ml).
      updateData.base_unit_cost = price / calcQty;
      updateData.supplier_id = finalSupplierId;
    }

    await supabase.from('ingredients')
      .update(updateData)
      .eq('id', movementIngredient.id);
      
    setIsSavingMovement(false);
    setIsMovementOpen(false);
    fetchIngredients();
    if (activeTab === 'movimentacoes') fetchMovements();
  };

  const handleSave = () => {
    setIsDialogOpen(false);
    fetchIngredients();
  };

  const handleDelete = async (ing: Ingredient) => {
    const linkedRecipes = ing.recipe_ingredients?.filter(ri => ri.recipes).map(ri => ri.recipes.name) || [];
    
    if (linkedRecipes.length > 0) {
      if (!confirm(`Este ingrediente está vinculado a ${linkedRecipes.length} receita(s) (ex: ${linkedRecipes[0]}).\nSe você excluí-lo, as receitas continuarão usando o custo salvo anteriormente, mas ele não aparecerá mais no inventário.\n\nDeseja mesmo excluí-lo?`)) {
        return;
      }
    } else {
      if (!confirm('Tem certeza que deseja excluir este item?')) return;
    }
    
    await supabase.from('ingredients').update({ deleted_at: new Date().toISOString() }).eq('id', ing.id);
    fetchIngredients();
  };

  const isSelectedSupplierExactMatch = supplierId && supplierList.find(s => s.id === supplierId)?.name === supplierSearch;
  const filteredSuppliers = isSelectedSupplierExactMatch 
    ? supplierList 
    : supplierList.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));

  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando inventário...</div>;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Meu Inventário</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">Controle de estoque de ingredientes e embalagens.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'estoque' && (
            <button 
              onClick={() => handleOpenDialog()}
              className="flex items-center justify-center gap-2 bg-primary text-white font-bold text-[13px] px-4 py-2.5 rounded-[1.25rem] hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Novo Item
            </button>
          )}
          
          <IngredientDialog 
            open={isDialogOpen} 
            onOpenChange={setIsDialogOpen} 
            ingredientToEdit={editingIngredient} 
            onSave={handleSave} 
          />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-6 border-b-2 border-surface-container mb-6">
        <button 
          onClick={() => { setActiveTab('estoque'); setSearchTerm(''); setCategoryFilter('todas'); setSortOrder('recentes'); setSupplierFilter('todos'); }} 
          className={`pb-3 font-label-md uppercase tracking-wider relative transition-colors ${activeTab === 'estoque' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Estoque Atual
          {activeTab === 'estoque' && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-primary rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => { setActiveTab('movimentacoes'); setSearchTerm(''); setCategoryFilter('todas'); setSortOrder('recentes'); setSupplierFilter('todos'); }} 
          className={`pb-3 font-label-md uppercase tracking-wider relative transition-colors ${activeTab === 'movimentacoes' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Extrato de Movimentações
          {activeTab === 'movimentacoes' && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-primary rounded-t-full"></div>}
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] z-10">search</span>
          <Input 
            type="text" 
            placeholder={activeTab === 'estoque' ? "Buscar insumos..." : "Buscar movimentações..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="w-full md:w-48">
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'todas')}>
              <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
                <SelectValue placeholder={activeTab === 'estoque' ? "Todas as categorias" : "Todos os tipos"} />
              </SelectTrigger>
              <SelectContent>
                {activeTab === 'estoque' ? (
                  <>
                    <SelectItem value="todas">Todas as categorias</SelectItem>
                    <SelectItem value="Ingrediente">Ingredientes</SelectItem>
                    <SelectItem value="Embalagem">Embalagens</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="todas">Todos os tipos</SelectItem>
                    <SelectItem value="entradas">Entradas</SelectItem>
                    <SelectItem value="saidas">Saídas</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          {activeTab === 'movimentacoes' && (
            <div className="w-full md:w-48">
              <Select value={supplierFilter} onValueChange={(val) => setSupplierFilter(val || 'todos')}>
                <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os forn.</SelectItem>
                  {supplierList.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="w-full md:w-48">
            <Select value={sortOrder} onValueChange={(val) => setSortOrder(val || 'az')}>
              <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
                <SelectValue placeholder="Mais recentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="antigas">Mais antigas</SelectItem>
                <SelectItem value="az">A-Z</SelectItem>
                {activeTab === 'estoque' && <SelectItem value="za">Z-A</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-10">
        {activeTab === 'estoque' ? (() => {
          const filteredIngredients = ingredients
            .filter(ing => ing.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(ing => categoryFilter === 'todas' || ing.category === categoryFilter)
            .sort((a, b) => {
              if (sortOrder === 'az') return a.name.localeCompare(b.name);
              if (sortOrder === 'za') return b.name.localeCompare(a.name);
              // recent/old doesn't make much sense without created_at in ingredient view, fallback to name
              return a.name.localeCompare(b.name);
            });

          return (
          <div className="flex flex-col gap-4">
            {filteredIngredients.length === 0 ? (
              <div className="py-xl flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-lowest rounded-3xl border-2 border-dashed border-surface-container">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">inventory_2</span>
                <p className="font-body-md text-center max-w-md">Nenhum item encontrado.</p>
              </div>
            ) : (
              filteredIngredients.map((ing) => (
                <div key={ing.id} className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sticker hover:scale-[1.01] transition-all relative overflow-hidden group border-2 border-surface-container gap-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                  
                  {/* Left side: Icon + Name */}
                  <div className="flex items-center gap-4 flex-1 w-full relative z-10">
                    <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0 shadow-inner">
                      <span className="material-symbols-outlined text-secondary text-[16px]">{ing.category === 'Embalagem' ? 'package' : 'kitchen'}</span>
                    </div>
                    <div className="flex flex-col overflow-hidden w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-headline-sm text-[16px] text-[#3e1d15] truncate" title={ing.name}>{ing.name}</h3>
                        <span className="px-2 py-0.5 bg-surface rounded-md text-[9px] font-bold text-on-surface-variant uppercase tracking-wider border border-outline-variant/30">{ing.category}</span>
                        {(Number(ing.min_stock_limit) > 0 && Number(ing.current_stock) <= Number(ing.min_stock_limit)) && (
                          <span className="material-symbols-outlined text-error text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} title="Estoque baixo">warning</span>
                        )}
                      </div>
                      {ing.suppliers?.name && (
                        <p className="text-[13px] text-[#87655F] truncate">
                          Fornecedor: {ing.suppliers.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle: Stats & Stock */}
                  <div className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-8 w-full md:w-auto px-0 md:px-6 relative z-10">
                    <div className="text-right border-l-2 border-dashed border-surface-container-high pl-4 md:pl-6">
                      <p className="text-[10px] text-[#87655F] uppercase tracking-wider mb-0.5 font-medium">Estoque Atual</p>
                      <span className={`text-[15px] font-bold ${(Number(ing.min_stock_limit) > 0 && Number(ing.current_stock) <= Number(ing.min_stock_limit)) ? 'text-error' : 'text-[#3e1d15]'}`}>
                        {Number(ing.current_stock).toLocaleString('pt-BR')}
                        <span className="text-[11px] text-[#87655F]/70 ml-1">{getBaseUnitLabel(ing.purchase_unit)}</span>
                      </span>
                    </div>
                    <div className="text-right border-l-2 border-dashed border-surface-container-high pl-4 md:pl-6 hidden sm:block">
                      <p className="text-[10px] text-[#87655F] uppercase tracking-wider mb-0.5 font-medium">Estoque Mínimo</p>
                      <span className="text-[15px] font-bold text-[#87655F]">
                        {Number(ing.min_stock_limit) > 0 ? (
                          <>
                            {Number(ing.min_stock_limit).toLocaleString('pt-BR')}
                            <span className="text-[11px] text-[#87655F]/70 ml-1">{getBaseUnitLabel(ing.purchase_unit)}</span>
                          </>
                        ) : (
                          <span className="text-[12px] font-normal italic">Não controlado</span>
                        )}
                      </span>
                    </div>
                    <div className="text-right border-l-2 border-dashed border-surface-container-high pl-4 md:pl-6">
                      <p className="text-[10px] text-[#87655F] uppercase tracking-wider mb-0.5 font-medium">Custo Base</p>
                      <span className="text-[14px] text-primary font-bold">
                        {Number(ing.base_unit_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-[11px] text-[#87655F]/70 ml-1">/{getBaseUnitLabel(ing.purchase_unit)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right side: Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end md:pl-4 md:border-l-2 border-surface-container-low relative z-10 pt-4 md:pt-0 border-t-2 md:border-t-0 border-dashed border-surface-container-high md:border-solid">
                    <button 
                      onClick={() => {
                        if (!ing.recipe_ingredients || ing.recipe_ingredients.length === 0) return;
                        setSelectedLinkedRecipes(ing.recipe_ingredients as any);
                        setSelectedLinkedIngredientName(ing.name);
                        setSelectedLinkedIngredientUnit(ing.purchase_unit);
                        setLinkedRecipesModalOpen(true);
                      }} 
                      disabled={!ing.recipe_ingredients || ing.recipe_ingredients.length === 0}
                      title={ing.recipe_ingredients && ing.recipe_ingredients.length > 0 ? "Ver receitas vinculadas" : "Nenhuma receita vinculada"} 
                      className={`w-10 h-10 rounded-full flex items-center justify-center relative shadow-sm md:shadow-none transition-colors ${
                        ing.recipe_ingredients && ing.recipe_ingredients.length > 0
                          ? "bg-surface md:bg-transparent hover:bg-error-container hover:text-error text-error group cursor-pointer" 
                          : "bg-transparent text-on-surface-variant/30 cursor-default shadow-none"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">link</span>
                      {ing.recipe_ingredients && ing.recipe_ingredients.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-error text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{ing.recipe_ingredients.length}</span>
                      )}
                    </button>
                    <button onClick={() => handleOpenMovement(ing)} title="Movimentar Estoque" className="w-10 h-10 rounded-full bg-surface md:bg-transparent hover:bg-tertiary-container hover:text-on-tertiary-container transition-colors flex items-center justify-center shadow-sm md:shadow-none text-tertiary">
                      <span className="material-symbols-outlined text-[16px]">swap_vert</span>
                    </button>
                    <button onClick={() => handleOpenDialog(ing)} title="Editar" className="w-10 h-10 rounded-full bg-surface md:bg-transparent hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center shadow-sm md:shadow-none">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => handleDelete(ing)} title="Excluir" className="w-10 h-10 rounded-full bg-surface md:bg-transparent hover:bg-error-container text-error transition-colors flex items-center justify-center shadow-sm md:shadow-none">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          );
        })() : (() => {
          const filteredMovements = movements
            .filter(mov => mov.ingredients?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(mov => {
              if (supplierFilter !== 'todos' && mov.supplier_id !== supplierFilter) return false;
              if (categoryFilter === 'todas') return true;
              if (categoryFilter === 'entradas' && mov.type === 'in') return true;
              if (categoryFilter === 'saidas' && mov.type === 'out') return true;
              return false;
            })
            .sort((a, b) => {
              if (sortOrder === 'az') return (a.ingredients?.name || '').localeCompare(b.ingredients?.name || '');
              if (sortOrder === 'antigas') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

          return (
          <div className="flex flex-col gap-3">
            {loadingMovements ? (
              <div className="p-xl text-center text-on-surface-variant">Carregando movimentações...</div>
            ) : filteredMovements.length === 0 ? (
              <div className="py-xl flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-lowest rounded-3xl border-2 border-dashed border-surface-container">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">receipt_long</span>
                <p className="font-body-md text-center max-w-md">Nenhuma movimentação registrada.<br/>As entradas de compras e saídas de receitas aparecerão aqui.</p>
              </div>
            ) : (
              filteredMovements.map(mov => (
                <div key={mov.id} className="flex justify-between items-center bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-surface-container hover:shadow-md transition-shadow group">
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm ${mov.type === 'in' ? 'bg-primary text-white' : 'bg-[#2e6d3d] text-white'}`}>
                       <span className="material-symbols-outlined">{mov.type === 'in' ? 'arrow_downward' : 'arrow_upward'}</span>
                     </div>
                     <div>
                       <p className="font-bold text-[#3e1d15] text-[15px]">{mov.ingredients?.name}</p>
                       <p className="text-[12px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                         <span className="material-symbols-outlined text-[14px]">schedule</span>
                         {new Date(mov.created_at).toLocaleString('pt-BR')} • {translateReason(mov.reason)}
                       </p>
                     </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className={`font-bold text-lg ${mov.type === 'in' ? 'text-primary' : 'text-[#2e6d3d]'}`}>
                      {mov.type === 'in' ? '+' : '-'}{mov.quantity} <span className="text-[12px] font-medium opacity-80">{getBaseUnitLabel(mov.ingredients?.purchase_unit || '')}</span>
                    </div>
                    {mov.type === 'in' && mov.price && (
                      <div className="text-[12px] text-[#87655F]">
                        {Number(mov.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} • {mov.suppliers?.name || 'Sem fornecedor'}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          );
        })()}
      </div>

      {/* Stock Movement Dialog */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent className="sm:max-w-[400px] bg-surface-container-lowest border-2 border-primary-container rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline-sm text-primary">Movimentar Estoque</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveMovement} className="space-y-6 pt-4">
            <div className="bg-surface p-4 rounded-xl border border-outline-variant/30 flex justify-between items-center">
              <div>
                <p className="font-bold text-[#3e1d15] text-sm">{movementIngredient?.name}</p>
                <p className="text-xs text-on-surface-variant">Estoque atual: {movementIngredient?.current_stock} {getBaseUnitLabel(movementIngredient?.purchase_unit || '')}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-on-surface">Tipo</Label>
                <Select 
                  value={movementType === 'in' ? 'Entrada' : 'Saída'} 
                  onValueChange={(v: any) => setMovementType(v === 'Entrada' ? 'in' : 'out')}
                >
                  <SelectTrigger className="w-full bg-surface border-2 border-outline-variant !h-12 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entrada">Entrada (+)</SelectItem>
                    <SelectItem value="Saída">Saída (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-on-surface">Quantidade</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    required
                    value={movementQty}
                    onChange={(e) => setMovementQty(e.target.value)}
                    className="bg-surface border-2 border-outline-variant h-12 rounded-2xl flex-1 min-w-0"
                  />
                  <Select value={movementUnit} onValueChange={(val) => setMovementUnit(val || 'g')}>
                    <SelectTrigger className="bg-surface border-2 border-outline-variant !h-12 rounded-2xl w-24 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {movementIngredient && getBaseUnitLabel(movementIngredient.purchase_unit) === 'g' && (
                        <>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                        </>
                      )}
                      {movementIngredient && getBaseUnitLabel(movementIngredient.purchase_unit) === 'ml' && (
                        <>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="litro">L</SelectItem>
                        </>
                      )}
                      {movementIngredient && getBaseUnitLabel(movementIngredient.purchase_unit) === 'un' && (
                        <SelectItem value="un">un</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {movementType === 'in' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mov_price" className="text-on-surface">Preço pago (R$)</Label>
                  <Input id="mov_price" type="text" inputMode="numeric" className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12" value={movementPrice} onChange={(e) => setMovementPrice(formatCurrencyInput(e.target.value))} required />
                </div>
                <div className="space-y-2 relative" ref={supplierDropdownRef}>
                  <Label htmlFor="mov_supplier" className="text-on-surface">Fornecedor</Label>
                  <Input 
                    id="mov_supplier" 
                    placeholder="Buscar ou criar..."
                    className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12" 
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
                      
                      {supplierSearch.trim() && !supplierList.find(s => s.name.toLowerCase() === supplierSearch.toLowerCase()) && (
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
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setIsMovementOpen(false)}
                className="px-6 py-3 font-label-md text-on-surface hover:bg-surface-container-high rounded-full transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSavingMovement}
                className="px-6 py-3 bg-primary text-white font-bold text-[13px] rounded-full hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-2"
              >
                {isSavingMovement ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Linked Recipes Dialog */}
      <Dialog open={linkedRecipesModalOpen} onOpenChange={setLinkedRecipesModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-surface-container-lowest border-2 border-primary-container rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline-sm text-primary">Receitas Vinculadas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="font-body-md text-on-surface-variant">O ingrediente <strong className="text-[#3e1d15]">{selectedLinkedIngredientName}</strong> está sendo usado nas seguintes receitas:</p>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
              {selectedLinkedRecipes.map((ri, idx) => (
                <div key={idx} className="flex justify-between items-center bg-surface-container-low p-3 rounded-xl border border-surface-container">
                  <span className="font-medium text-[#3e1d15]">{ri.recipes?.name}</span>
                  <span className="text-[13px] text-primary font-bold">{ri.quantity_used} {getBaseUnitLabel(selectedLinkedIngredientUnit)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setLinkedRecipesModalOpen(false)}
                className="px-6 py-3 font-label-md text-on-surface hover:bg-surface-container-high rounded-full transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
