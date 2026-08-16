import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from "@/components/ui/label";
import { formatCurrencyInput, getUnitCost } from "@/lib/utils";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';
import { useShoppingLists } from '@/hooks/useShoppingLists';
import { useShoppingListItems } from '@/hooks/useShoppingListItems';
import { useIngredients } from '@/hooks/useIngredients';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useRecipes } from '@/hooks/useRecipes';

const createListSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
});
type CreateListFormValues = z.infer<typeof createListSchema>;

export const Shopping = () => {
  const { lists, isLoading, createList } = useShoppingLists();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const selectedList = lists.find(l => l.id === selectedListId) ?? null;

  const {
    items: listItems,
    isLoading: loadingItems,
    addItem,
    addItemsFromRecipe,
    deleteItem,
    togglePurchased,
    updateItemField,
    finishList,
  } = useShoppingListItems(selectedListId);

  const { ingredients: availableIngredients } = useIngredients();
  const { suppliers, findOrCreateSupplier } = useSuppliers();
  const { recipes } = useRecipes();

  // Create List Dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const {
    register: registerList,
    handleSubmit: handleSubmitList,
    reset: resetListForm,
    formState: { errors: listErrors, isSubmitting: isCreatingList },
  } = useForm<CreateListFormValues>({ resolver: zodResolver(createListSchema), defaultValues: { name: '' } });

  // Confirm Finish Dialog
  const [isConfirmFinishOpen, setIsConfirmFinishOpen] = useState(false);
  const [isSuccessToastOpen, setIsSuccessToastOpen] = useState(false);
  const [successToastMessage, setSuccessToastMessage] = useState('');

  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [globalSupplierId, setGlobalSupplierId] = useState<string>('none');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');
  const [sortOrder, setSortOrder] = useState('recentes');

  const onCreateList = async (values: CreateListFormValues) => {
    const created = await createList.mutateAsync(values.name.trim());
    setIsCreateOpen(false);
    resetListForm();
    setSelectedListId(created.id);
  };

  const handleAddFromRecipe = async () => {
    if (!selectedRecipeId) return;
    await addItemsFromRecipe.mutateAsync(selectedRecipeId);
    setIsRecipeModalOpen(false);
    setSelectedRecipeId('');
  };

  const handleFinishList = () => {
    if (!selectedList) return;
    if (listItems.length === 0) {
      alert("A lista está vazia!");
      return;
    }
    setIsConfirmFinishOpen(true);
  };

  const executeFinishList = async () => {
    if (!selectedList) return;
    setIsConfirmFinishOpen(false);

    let finalSupplierId: string | null = globalSupplierId === 'none' ? null : globalSupplierId;
    if (!finalSupplierId && supplierSearch.trim()) {
      finalSupplierId = await findOrCreateSupplier.mutateAsync(supplierSearch);
    }

    await finishList.mutateAsync({ list: selectedList, supplierId: finalSupplierId });

    setSelectedListId(null);
    setSuccessToastMessage('Compra finalizada com sucesso! Estoque e preços atualizados.');
    setIsSuccessToastOpen(true);
  };

  const filteredLists = useMemo(() => {
    return lists
      .filter(list => list.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(list => statusFilter === 'todas' || list.status === statusFilter)
      .sort((a, b) => {
        if (sortOrder === 'az') return a.name.localeCompare(b.name);
        if (sortOrder === 'za') return b.name.localeCompare(a.name);
        if (sortOrder === 'antigas') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [lists, searchTerm, statusFilter, sortOrder]);

  const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));

  if (isLoading) return <div className="p-xl text-center text-on-surface-variant">Carregando listas...</div>;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Compras</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">Gerencie suas listas de reabastecimento.</p>
        </div>
        {!selectedList && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary text-white font-bold text-[13px] px-4 py-2.5 rounded-[1.25rem] hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nova Lista
          </button>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {!selectedList ? (
          <>
            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center shrink-0">
              <div className="relative flex-1 w-full">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] z-10">search</span>
                <Input
                  type="text"
                  placeholder="Buscar listas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12"
                />
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <div className="w-full md:w-48">
                  <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'todas')}>
                    <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="completed">Concluídas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-48">
                  <Select value={sortOrder} onValueChange={(val) => setSortOrder(val || 'recentes')}>
                    <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
                      <SelectValue placeholder="Mais recentes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recentes">Mais recentes</SelectItem>
                      <SelectItem value="antigas">Mais antigas</SelectItem>
                      <SelectItem value="az">A-Z</SelectItem>
                      <SelectItem value="za">Z-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLists.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-lowest rounded-3xl border-2 border-dashed border-surface-container">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">shopping_cart</span>
                <p className="font-body-md text-center max-w-md">Você ainda não tem listas de compras.<br/>Crie uma para planejar suas idas ao fornecedor.</p>
              </div>
                ) : (
                  filteredLists.map(list => (
                    <div
                      key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className="bg-surface-container-lowest rounded-3xl p-6 cursor-pointer hover:shadow-float hover:-translate-y-1 transition-all border-2 border-transparent hover:border-primary-container group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${list.status === 'completed' ? 'bg-[#e2f1e5] text-[#2e6d3d]' : 'bg-[#faece8] text-primary'}`}>
                      <span className="material-symbols-outlined">{list.status === 'completed' ? 'check_circle' : 'shopping_basket'}</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full ${list.status === 'completed' ? 'bg-[#e2f1e5] text-[#2e6d3d]' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {list.status === 'completed' ? 'Concluída' : 'Pendente'}
                    </span>
                  </div>
                  <h3 className="font-display-sm text-lg text-[#3e1d15] mb-1">{list.name}</h3>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[12px] text-on-surface-variant">Criada em: {new Date(list.created_at).toLocaleDateString('pt-BR')}</p>
                    {list.status === 'completed' && list.completed_at && (
                      <p className="text-[12px] text-[#2e6d3d] font-medium">Concluída em: {new Date(list.completed_at).toLocaleDateString('pt-BR')}</p>
                    )}
                    {list.status === 'completed' && list.suppliers?.name && (
                      <p className="text-[12px] text-on-surface-variant">Fornecedor: {list.suppliers.name}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            </div>
          </div>
          </>
        ) : (
          // View: Single List Details
          <div className="flex flex-col gap-6 bg-surface-container-lowest rounded-3xl p-6 md:p-8 min-h-full border-2 border-surface-container">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedListId(null)}
                  className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-primary-container text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div>
                  <h3 className="font-display-md text-2xl text-[#3e1d15]">{selectedList.name}</h3>
                  <span className={`text-[11px] font-bold tracking-wider ${selectedList.status === 'completed' ? 'text-[#2e6d3d]' : 'text-primary'}`}>
                    Status: {selectedList.status === 'completed' ? 'CONCLUÍDA' : 'PENDENTE'}
                  </span>
                </div>
              </div>

              {selectedList.status === 'pending' && (
                <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto justify-end mt-4 md:mt-0">
                  <div className="flex items-center gap-2 bg-surface border-2 border-outline-variant/30 rounded-xl px-3 py-1.5 h-10 relative" ref={supplierDropdownRef}>
                    <span className="text-xs font-medium text-on-surface-variant whitespace-nowrap">Fornecedor:</span>
                    <Input
                      placeholder="Buscar ou criar..."
                      className="border-0 shadow-none focus-visible:ring-0 h-7 px-1 text-xs w-[130px] font-bold text-primary bg-transparent"
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setGlobalSupplierId('none');
                        setShowSupplierDropdown(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                    />
                    {showSupplierDropdown && (
                      <div className="absolute top-[45px] left-0 w-full min-w-[200px] bg-surface-container-lowest border-2 border-outline-variant/50 rounded-2xl shadow-sticker z-[100] max-h-48 overflow-y-auto p-1 text-left">
                        <div
                          className="px-3 py-2 hover:bg-secondary-container hover:text-on-secondary-container rounded-xl cursor-pointer font-body-md text-sm text-on-surface transition-colors"
                          onClick={() => {
                            setGlobalSupplierId('none');
                            setSupplierSearch('');
                            setShowSupplierDropdown(false);
                          }}
                        >
                          Sem fornecedor
                        </div>
                        {filteredSuppliers.map(s => (
                          <div
                            key={s.id}
                            className="px-3 py-2 hover:bg-secondary-container hover:text-on-secondary-container rounded-xl cursor-pointer font-body-md text-sm text-on-surface transition-colors"
                            onClick={() => {
                              setGlobalSupplierId(s.id);
                              setSupplierSearch(s.name);
                              setShowSupplierDropdown(false);
                            }}
                          >
                            {s.name}
                          </div>
                        ))}

                        {supplierSearch.trim() && !suppliers.find(s => s.name.toLowerCase() === supplierSearch.toLowerCase()) && (
                          <div
                            className="px-3 py-2 bg-primary-container/20 text-primary hover:bg-primary-container hover:text-on-primary-container rounded-xl cursor-pointer font-body-md text-sm font-bold transition-colors flex items-center gap-2"
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

                  <button
                    onClick={() => setIsRecipeModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-primary-container text-on-primary-container font-medium h-10 px-4 rounded-xl hover:bg-primary hover:text-white transition-colors shadow-sm whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[18px]">menu_book</span>
                    <span className="hidden sm:inline">Add. da Receita</span>
                  </button>

                  <button
                    onClick={handleFinishList}
                    disabled={finishList.isPending}
                    className="bg-[#2e6d3d] text-white font-label-md px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm hover:bg-[#235830] active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">done_all</span>
                    {finishList.isPending ? 'Processando...' : 'Finalizar Compra'}
                  </button>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="mt-4 border border-outline-variant/20 rounded-2xl overflow-hidden bg-surface">
              <div className="grid grid-cols-12 gap-4 p-4 bg-surface-container-lowest border-b border-outline-variant/20 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wider">
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-4">Insumo</div>
                <div className="col-span-2 text-right">Qtd</div>
                <div className="col-span-2 text-right" title="Custo Base da Última Compra">Último Custo</div>
                <div className="col-span-2 text-right">Total Pago</div>
                <div className="col-span-1"></div>
              </div>

              <div className="flex flex-col">
                {loadingItems ? (
                  <div className="p-8 text-center text-on-surface-variant">Carregando itens...</div>
                ) : listItems.length === 0 ? (
                  <div className="p-8 text-center text-on-surface-variant">Lista vazia. Adicione itens que precisa comprar.</div>
                ) : (
                  listItems.map((item) => {
                    const lastCost = item.ingredients
                      ? getUnitCost(item.ingredients.purchase_price, item.ingredients.purchase_quantity, item.ingredients.purchase_unit)
                        * (item.ingredients.purchase_unit === 'kg' || item.ingredients.purchase_unit === 'litro' ? 1000 : 1)
                      : 0;

                    return (
                    <div key={item.id} className={`relative grid grid-cols-12 gap-4 p-4 items-center border-b border-outline-variant/10 last:border-0 hover:bg-surface-container-lowest transition-colors ${item.purchased ? 'opacity-60' : ''}`}>
                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => togglePurchased.mutate(item)}
                          disabled={selectedList.status === 'completed'}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${item.purchased ? 'bg-primary border-primary text-white' : 'border-outline-variant text-transparent hover:border-primary'}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </button>
                      </div>
                      <div className="col-span-4 flex flex-col">
                        <span className={`font-medium ${item.purchased ? 'line-through text-on-surface-variant' : 'text-[#3e1d15]'}`}>
                          {item.ingredients?.name}
                        </span>
                        <span className="text-[10px] text-on-surface-variant">Estoque atual: {item.ingredients?.current_stock} {['kg', 'g'].includes(item.ingredients?.purchase_unit || '') ? 'g' : ['litro', 'ml'].includes(item.ingredients?.purchase_unit || '') ? 'ml' : 'un'}</span>
                      </div>

                      <div className="col-span-2 flex justify-end">
                        {selectedList.status === 'completed' ? (
                          <div className="text-right font-medium">
                            {item.quantity} <span className="text-[10px] text-on-surface-variant">{item.ingredients?.purchase_unit}</span>
                          </div>
                        ) : (
                          <div className="relative max-w-[110px]">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.quantity || ''}
                              onChange={(e) => updateItemField.mutate({ id: item.id, field: 'quantity', value: parseFloat(e.target.value) || 0 })}
                              className={`h-9 text-right font-medium ${item.ingredients?.purchase_unit && item.ingredients.purchase_unit.length > 3 ? 'pr-12' : 'pr-8'}`}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[10px] pointer-events-none">{item.ingredients?.purchase_unit}</span>
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 flex justify-end items-center">
                        <span className="text-[10px] text-on-surface-variant font-medium bg-surface-container px-2 py-1 rounded-md text-right whitespace-nowrap">
                          {lastCost > 0 ? (
                            <>
                              {lastCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              /{item.ingredients?.purchase_unit}
                            </>
                          ) : '-'}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        {selectedList.status === 'completed' ? (
                          <span className="font-bold text-primary">
                            {Number(item.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        ) : (
                          <div className="relative max-w-[100px]">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">R$</span>
                            <Input
                              type="text"
                              value={item.price > 0 ? formatCurrencyInput(item.price) : ''}
                              onChange={(e) => {
                                const cleanString = e.target.value.replace(/\D/g, '');
                                const val = cleanString === '' ? 0 : parseInt(cleanString, 10) / 100;
                                updateItemField.mutate({ id: item.id, field: 'price', value: val });
                              }}
                              placeholder="0,00"
                              className="pl-6 h-9 text-right font-medium"
                            />
                          </div>
                        )}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {selectedList.status === 'pending' && (
                          <button onClick={() => deleteItem.mutate(item.id)} className="text-on-surface-variant hover:text-error transition-colors">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        )}
                      </div>
                    </div>
                    );
                  })
                )}

                {selectedList && selectedList.status === 'pending' && (
                  <div className="grid grid-cols-12 gap-4 p-4 items-center border-t border-outline-variant/10 bg-primary-container/5 hover:bg-primary-container/10 transition-colors group">
                    <div className="col-span-1 flex justify-center">
                      <span className="material-symbols-outlined text-primary text-[20px] group-hover:scale-110 transition-transform">add_circle</span>
                    </div>
                    <div className="col-span-11 sm:col-span-6 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex-1 w-full">
                        <Select
                          value=""
                          onValueChange={(val) => { if (val) addItem.mutate(val); }}
                        >
                          <SelectTrigger className="bg-surface border-2 border-primary/20 hover:border-primary/50 text-primary font-medium rounded-xl h-10 transition-colors shadow-sm w-full">
                            <SelectValue placeholder="Adicionar Insumo..." />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            {availableIngredients.map(ing => (
                              <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedList.status === 'completed' && (
              <div className="mt-4 p-4 bg-[#e2f1e5]/40 rounded-2xl flex items-center gap-3 border border-[#2e6d3d]/20">
                <span className="material-symbols-outlined text-[#2e6d3d]">info</span>
                <p className="text-sm text-[#2e6d3d]">Esta lista já foi finalizada. O estoque e os preços dos itens foram atualizados no inventário.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create List Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[400px] bg-surface border-2 border-primary-container rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline-sm text-primary">Nova Lista de Compras</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitList(onCreateList)} noValidate className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome da Lista</Label>
              <Input
                placeholder="Ex: Compras Atacadão"
                aria-invalid={!!listErrors.name}
                className="bg-surface border-2 border-outline-variant h-12 rounded-2xl"
                {...registerList('name')}
              />
              {listErrors.name && <p className="text-[12px] text-error">{listErrors.name.message}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 hover:bg-surface-container rounded-full">Cancelar</button>
              <button type="submit" disabled={isCreatingList} className="px-4 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary/90 disabled:opacity-50">Criar</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recipe Modal */}
      <Dialog open={isRecipeModalOpen} onOpenChange={setIsRecipeModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-surface border-2 border-primary-container rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline-sm text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px]">menu_book</span>
              Adicionar Itens da Receita
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Selecione uma receita</Label>
              <Select value={selectedRecipeId} onValueChange={(val) => setSelectedRecipeId(val || '')}>
                <SelectTrigger className="bg-surface border-2 border-outline-variant h-12 rounded-2xl">
                  <SelectValue placeholder="Escolha a receita...">
                    {recipes.find(r => r.id === selectedRecipeId)?.name || 'Escolha a receita...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {recipes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name || 'Receita sem nome'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsRecipeModalOpen(false)} className="px-4 py-2 hover:bg-surface-container rounded-full font-label-md">Cancelar</button>
              <button
                type="button"
                onClick={handleAddFromRecipe}
                disabled={!selectedRecipeId || addItemsFromRecipe.isPending}
                className="px-4 py-2 bg-primary text-white font-bold rounded-full hover:bg-primary/90 font-label-md disabled:opacity-50"
              >
                {addItemsFromRecipe.isPending ? 'Adicionando...' : 'Adicionar Itens'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Finish Modal */}
      <Dialog open={isConfirmFinishOpen} onOpenChange={setIsConfirmFinishOpen}>
        <DialogContent className="sm:max-w-[420px] bg-surface border-2 border-primary-container rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline-sm text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px]">shopping_cart_checkout</span>
              Finalizar Compra
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-on-surface-variant font-body-md leading-relaxed">
            Deseja finalizar esta compra? Isso dará entrada no estoque de todos os itens acima e atualizará seus preços baseados nos valores digitados.
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsConfirmFinishOpen(false)} className="px-5 py-2 hover:bg-surface-container rounded-full font-label-md transition-colors">Cancelar</button>
            <button type="button" onClick={executeFinishList} className="px-5 py-2 bg-[#2e6d3d] text-white font-bold rounded-full hover:bg-[#235830] font-label-md shadow-sm transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">done_all</span>
              Confirmar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Toast
        open={isSuccessToastOpen}
        onOpenChange={setIsSuccessToastOpen}
        title="Sucesso!"
        description={successToastMessage}
      />
    </div>
  );
};
