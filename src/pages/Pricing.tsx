import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';

export const Pricing = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [savedPricings, setSavedPricings] = useState<any[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'listagem' | 'calculadora'>('listagem');
  const [saving, setSaving] = useState(false);

  // Editable pricing fields
  const [packagingCost, setPackagingCost] = useState(formatCurrencyInput(0));
  const [laborHourValue, setLaborHourValue] = useState(formatCurrencyInput(0));
  const [fixedCostsMonthly, setFixedCostsMonthly] = useState(formatCurrencyInput(0));
  const [estimatedMonthlyProduction, setEstimatedMonthlyProduction] = useState('1');
  const [cardFeePercent, setCardFeePercent] = useState('0');
  const [profitMarginPercent, setProfitMarginPercent] = useState('0');
  const [savedPrice, setSavedPrice] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Load Settings
      const { data: settingsData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (settingsData) {
        setLaborHourValue(formatCurrencyInput(settingsData.labor_hour_value));
        setFixedCostsMonthly(formatCurrencyInput(settingsData.fixed_costs_monthly));
        setEstimatedMonthlyProduction(settingsData.estimated_monthly_production.toString());
        setCardFeePercent(settingsData.default_card_fee_percent.toString());
        setProfitMarginPercent(settingsData.default_profit_margin_percent.toString());
      }

      // Load Recipes with ingredients
      const { data: recipesData } = await supabase
        .from('recipes')
        .select(`
          id, name, yield, prep_time_minutes,
          recipe_ingredients(
            quantity_used,
            ingredients(base_unit_cost)
          )
        `)
        .eq('user_id', user.id)
        .order('name');
        
      if (recipesData) {
        setRecipes(recipesData);
      }
      
      // Load saved pricings
      const { data: pricingsData } = await supabase
        .from('pricings')
        .select(`*, recipes(name, yield, category)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (pricingsData) {
        setSavedPricings(pricingsData);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const fetchPricings = async () => {
    if (!user) return;
    const { data: pricingsData } = await supabase
      .from('pricings')
      .select(`*, recipes(name, yield, category)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (pricingsData) {
      setSavedPricings(pricingsData);
    }
  };

  const selectedRecipe = useMemo(() => {
    return recipes.find(r => r.id === selectedRecipeId);
  }, [recipes, selectedRecipeId]);

  const uniqueCategories = useMemo(() => {
    const ObjectCategoryList = savedPricings.map(p => p.recipes?.category || 'Sem Categoria');
    return Array.from(new Set(ObjectCategoryList)).sort();
  }, [savedPricings]);

  const filteredPricings = useMemo(() => {
    return savedPricings.filter(p => {
      const recipeName = p.recipes?.name?.toLowerCase() || '';
      const recipeCategory = p.recipes?.category || 'Sem Categoria';
      
      const matchesSearch = recipeName.includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'todas' || recipeCategory === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [savedPricings, searchTerm, categoryFilter]);

  // Calculations
  const calculations = useMemo(() => {
    if (!selectedRecipe) return null;

    // 1. Ingredients Cost
    const totalIngredientsCost = selectedRecipe.recipe_ingredients.reduce((total: number, ri: any) => {
      return total + (ri.quantity_used * ri.ingredients.base_unit_cost);
    }, 0);
    const ingredientCostPerUnit = totalIngredientsCost / selectedRecipe.yield;

    // 2. Labor Cost per unit
    const lhVal = parseCurrencyInput(laborHourValue);
    // Labor cost = (hourly rate / 60) * prep time in minutes
    const totalLaborCost = (lhVal / 60) * selectedRecipe.prep_time_minutes;
    const laborCostPerUnit = totalLaborCost / selectedRecipe.yield;

    // 3. Fixed Cost per unit
    const fcMonthly = parseCurrencyInput(fixedCostsMonthly);
    const estProd = parseFloat(estimatedMonthlyProduction) || 1;
    const fixedCostPerUnit = fcMonthly / estProd;

    // 4. Packaging
    const packCost = parseCurrencyInput(packagingCost);

    // Total Cost
    const totalCost = ingredientCostPerUnit + laborCostPerUnit + fixedCostPerUnit + packCost;

    // 5. Margin and Fee
    const margin = parseFloat(profitMarginPercent) || 0;
    const fee = parseFloat(cardFeePercent) || 0;

    // Suggested Price Formula:
    // Price = Total Cost / (1 - (Margin% + Fee%) / 100)
    const divisor = 1 - ((margin + fee) / 100);
    const suggestedPrice = divisor > 0 ? totalCost / divisor : 0;

    // 6. Profit
    const feeAmount = suggestedPrice * (fee / 100);
    const profitAmount = suggestedPrice - totalCost - feeAmount;

    return {
      ingredientCostPerUnit,
      laborCostPerUnit,
      fixedCostPerUnit,
      packCost,
      totalCost,
      suggestedPrice,
      profitAmount,
      feeAmount,
    };
  }, [
    selectedRecipe,
    packagingCost,
    laborHourValue,
    fixedCostsMonthly,
    estimatedMonthlyProduction,
    cardFeePercent,
    profitMarginPercent
  ]);

  const handleSavePricing = async () => {
    if (!user || !selectedRecipeId || !calculations) return;
    
    setSaving(true);
    const pricingData = {
      recipe_id: selectedRecipeId,
      user_id: user.id,
      packaging_cost: parseCurrencyInput(packagingCost),
      labor_cost: calculations.laborCostPerUnit,
      fixed_costs: calculations.fixedCostPerUnit,
      card_fee_percent: parseFloat(cardFeePercent) || 0,
      profit_margin_percent: parseFloat(profitMarginPercent) || 0,
      suggested_price: calculations.suggestedPrice,
      saved_price: savedPrice ? parseCurrencyInput(savedPrice) : null,
    };

    // Upsert pricing for this recipe
    const existingPricing = savedPricings.find(p => p.recipe_id === selectedRecipeId);
    
    if (existingPricing) {
      await supabase.from('pricings').update(pricingData).eq('id', existingPricing.id);
    } else {
      await supabase.from('pricings').insert({ ...pricingData, created_at: new Date().toISOString() });
    }

    await fetchPricings();
    setSaving(false);
    setActiveTab('listagem');
  };

  const handleDeletePricing = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta precificação?')) return;
    await supabase.from('pricings').delete().eq('id', id);
    await fetchPricings();
  };

  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando precificação...</div>;

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Precificação</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">Calcule e salve o preço ideal para suas receitas.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'listagem' ? (
            <button 
              onClick={() => {
                setSelectedRecipeId('');
                setSavedPrice('');
                setActiveTab('calculadora');
              }}
              className="flex items-center justify-center gap-2 bg-primary text-white font-bold text-[13px] px-4 py-2.5 rounded-[1.25rem] hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)]"
            >
              <span className="material-symbols-outlined text-[18px]">calculate</span>
              Nova Precificação
            </button>
          ) : null}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-6 border-b-2 border-surface-container mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('listagem')}
          className={`pb-3 font-label-md uppercase tracking-wider relative transition-colors whitespace-nowrap ${activeTab === 'listagem' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Minhas Precificações
          {activeTab === 'listagem' && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-primary rounded-t-full"></div>}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('calculadora')}
          className={`pb-3 font-label-md uppercase tracking-wider relative transition-colors whitespace-nowrap ${activeTab === 'calculadora' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Calculadora
          {activeTab === 'calculadora' && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-primary rounded-t-full"></div>}
        </button>
      </div>

      {activeTab === 'listagem' && (
        <div className="flex-1 flex flex-col">
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] z-10">search</span>
              <Input 
                type="text" 
                placeholder="Buscar receita..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12"
              />
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <div className="w-full md:w-48">
                <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'todas')}>
                  <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
                    <SelectValue placeholder="Todas as Categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Categorias</SelectItem>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat as string} value={cat as string}>{cat as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {savedPricings.length === 0 ? (
            <div className="flex-1 bg-surface-container-lowest rounded-3xl border-2 border-surface-container flex flex-col items-center justify-center py-xl px-4 text-center shadow-sticker">
              <div className="w-20 h-20 bg-primary-container/20 rounded-full flex items-center justify-center mb-md text-primary">
                <span className="material-symbols-outlined text-5xl">payments</span>
              </div>
              <h3 className="font-headline-md text-on-surface mb-2">Nenhuma precificação salva</h3>
              <p className="font-body-md text-on-surface-variant max-w-md mb-6">
                Você ainda não salvou a precificação de nenhuma receita. Use a calculadora para encontrar seu preço ideal.
              </p>
              <button 
                onClick={() => setActiveTab('calculadora')}
                className="bg-primary text-white font-bold text-[13px] px-6 py-3 rounded-full hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
              >
                Ir para a Calculadora
              </button>
            </div>
          ) : filteredPricings.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant font-body-md bg-surface-container-lowest rounded-[2rem] border-2 border-surface-container border-dashed">
              Nenhuma precificação encontrada para estes filtros.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredPricings.map(pricing => {
                const totalCost = ((pricing.packaging_cost + pricing.labor_cost + pricing.fixed_costs + ((pricing.suggested_price * (1 - (pricing.profit_margin_percent + pricing.card_fee_percent)/100)) - pricing.packaging_cost - pricing.labor_cost - pricing.fixed_costs)) || 0);

                return (
                <div key={pricing.id} className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container hover:shadow-md transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 group">
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display-md text-[18px] text-[#7A3326] leading-tight">{pricing.recipes?.name || 'Receita Excluída'}</h3>
                      <span className="text-[11px] text-[#B08D87] bg-[#FFF4F2] px-2 py-0.5 rounded-full border border-[#DF7159]/20 font-medium">Rende {pricing.recipes?.yield || '-'} un</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
                      <span className="text-on-surface-variant font-medium">Custo Total (estimado): <strong className="text-on-surface font-semibold">{totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/un</strong></span>
                      <span className="text-on-surface-variant font-medium">Margem/Taxas: <strong className="text-on-surface font-semibold">{pricing.profit_margin_percent}% / {pricing.card_fee_percent}%</strong></span>
                      <span className="text-on-surface-variant font-medium">Preço Sugerido Base: <strong className="text-on-surface font-semibold">{pricing.suggested_price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
                    </div>
                  </div>
                  
                  <div className="flex flex-row items-center gap-3 shrink-0 w-full lg:w-auto justify-between lg:justify-end pt-4 lg:pt-0 border-t border-dashed border-surface-container lg:border-t-0">
                    <div className="bg-[#FDF0EC] border border-[#F6DED8] rounded-xl px-4 py-2 flex flex-col items-center justify-center min-w-[120px]">
                      <span className="text-[10px] font-bold text-[#DF7159] tracking-wider uppercase">{pricing.saved_price ? 'Preço Definido' : 'Preço Sugerido'}</span>
                      <strong className="text-[18px] font-display-md text-primary">
                        {(pricing.saved_price || pricing.suggested_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedRecipeId(pricing.recipe_id);
                          setPackagingCost(formatCurrencyInput(pricing.packaging_cost));
                          setCardFeePercent(pricing.card_fee_percent.toString());
                          setProfitMarginPercent(pricing.profit_margin_percent.toString());
                          setSavedPrice(pricing.saved_price ? formatCurrencyInput(pricing.saved_price) : '');
                          setActiveTab('calculadora');
                        }}
                        className="bg-white text-[#87655F] font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-[#FDF0EC] hover:text-primary active:scale-95 transition-all border border-surface-container flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                      
                      <button 
                        onClick={() => handleDeletePricing(pricing.id)}
                        className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container shadow-sm active:scale-95 transition-all"
                        title="Excluir"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      )}

      {activeTab === 'calculadora' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Settings and Recipe Selection */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-surface-container-lowest p-lg rounded-3xl shadow-sticker border-4 border-surface-container relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-fixed-dim opacity-20 blur-2xl -mr-10 -mt-10"></div>
            <h3 className="font-headline-sm text-on-surface mb-md relative z-10">1. Escolha a Receita</h3>
            <div className="relative z-10">
              <Select value={selectedRecipeId} onValueChange={(val) => setSelectedRecipeId(val || '')}>
                <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md h-10 w-full rounded-full focus:ring-tertiary-fixed">
                  <SelectValue placeholder="Selecione a ficha técnica...">
                    {selectedRecipe?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-outline-variant">
                  {recipes.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={`bg-surface-container-lowest p-lg rounded-3xl shadow-sticker border-4 border-surface-container transition-opacity ${!selectedRecipe ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="font-headline-sm text-on-surface mb-2">2. Variáveis de Custo</h3>
            <p className="font-body-md text-on-surface-variant mb-6">Ajuste os valores para simular diferentes cenários nesta receita.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-label-md text-on-surface-variant">Embalagem (R$/un)</Label>
                <Input className="bg-surface border-2 border-outline-variant font-body-md h-10 rounded-xl focus-visible:ring-tertiary-fixed" type="text" inputMode="numeric" value={packagingCost} onChange={(e) => setPackagingCost(formatCurrencyInput(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="font-label-md text-on-surface-variant">Sua hora (R$)</Label>
                <Input className="bg-surface border-2 border-outline-variant font-body-md h-10 rounded-xl focus-visible:ring-tertiary-fixed" type="text" inputMode="numeric" value={laborHourValue} onChange={(e) => setLaborHourValue(formatCurrencyInput(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="font-label-md text-on-surface-variant">Custos Fixos/Mês</Label>
                <Input className="bg-surface border-2 border-outline-variant font-body-md h-10 rounded-xl focus-visible:ring-tertiary-fixed" type="text" inputMode="numeric" value={fixedCostsMonthly} onChange={(e) => setFixedCostsMonthly(formatCurrencyInput(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="font-label-md text-on-surface-variant">Produção/Mês (un)</Label>
                <Input className="bg-surface border-2 border-outline-variant font-body-md h-10 rounded-xl focus-visible:ring-tertiary-fixed" type="number" step="1" min="1" value={estimatedMonthlyProduction} onChange={(e) => setEstimatedMonthlyProduction(e.target.value)} />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-surface-container border-dashed">
              <h4 className="font-label-md text-on-surface uppercase tracking-wider mb-4 text-center">Margens e Taxas</h4>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between font-label-md">
                    <Label className="text-on-surface-variant">Taxa Cartão/Pix</Label>
                    <span className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full shadow-sm">{cardFeePercent}%</span>
                  </div>
                  <input className="w-full h-2 bg-surface-variant rounded-full appearance-none cursor-pointer accent-tertiary" type="range" min="0" max="20" step="0.1" value={cardFeePercent} onChange={(e) => setCardFeePercent(e.target.value)} />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between font-label-md">
                    <Label className="text-on-surface-variant">Margem de Lucro</Label>
                    <span className="bg-secondary-fixed text-on-secondary-fixed px-3 py-1 rounded-full shadow-sm">{profitMarginPercent}% alvo</span>
                  </div>
                  <input className="w-full h-2 bg-surface-variant rounded-full appearance-none cursor-pointer accent-secondary" type="range" min="0" max="100" step="1" value={profitMarginPercent} onChange={(e) => setProfitMarginPercent(e.target.value)} />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Results Display */}
        <div className="lg:col-span-7">
          {selectedRecipe && calculations ? (
            <div className="flex flex-col gap-6 sticky top-24">
              
              {/* Highlight Final Price Card */}
              <div className="bg-primary p-lg rounded-[3rem] shadow-sticker hover:shadow-[0_12px_24px_rgba(159,64,45,0.3)] transition-shadow relative overflow-hidden text-on-primary flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-primary-container">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary-container opacity-30 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-on-primary-fixed-variant opacity-20 rounded-full pointer-events-none"></div>
                
                <div className="relative z-10 flex-1 text-center md:text-left">
                  <span className="inline-block bg-on-primary text-primary font-label-sm px-4 py-1.5 rounded-full mb-4 shadow-sm uppercase tracking-wider">
                    Preço Sugerido (Unidade)
                  </span>
                  <h2 className="font-display-lg text-[42px] md:text-[56px] leading-none font-bold mb-2">
                    {calculations.suggestedPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </h2>
                  <p className="font-body-md text-primary-fixed opacity-90">
                    Rendimento base: {selectedRecipe.yield} unidades
                  </p>
                </div>

                <div className="relative z-10 bg-on-primary/10 p-6 rounded-3xl backdrop-blur-sm border border-white/20 w-full md:w-auto shrink-0 flex flex-col gap-4">
                  <div>
                    <span className="block font-label-sm text-primary-fixed uppercase tracking-wider mb-1">Custo Total Base</span>
                    <span className="font-headline-md font-bold">{calculations.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div>
                    <span className="block font-label-sm text-primary-fixed uppercase tracking-wider mb-1">Lucro Líquido</span>
                    <span className="font-headline-md font-bold text-[#E8F5E9]">{calculations.profitAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Cost Breakdown */}
                <div className="bg-surface-container-lowest p-md rounded-3xl shadow-sticker border-2 border-surface-container space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-inner">
                      <span className="material-symbols-outlined">receipt_long</span>
                    </div>
                    <h3 className="font-headline-sm text-on-surface">Custos por Unidade</h3>
                  </div>
                  
                  <div className="space-y-3 font-body-md">
                    <div className="flex justify-between items-end border-b-2 border-dashed border-surface-variant pb-2">
                      <span className="text-on-surface-variant">Ingredientes</span>
                      <span className="font-label-md text-on-surface">{calculations.ingredientCostPerUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between items-end border-b-2 border-dashed border-surface-variant pb-2">
                      <span className="text-on-surface-variant">Embalagem</span>
                      <span className="font-label-md text-on-surface">{calculations.packCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between items-end border-b-2 border-dashed border-surface-variant pb-2">
                      <span className="text-on-surface-variant">Mão de Obra ({selectedRecipe.prep_time_minutes}m)</span>
                      <span className="font-label-md text-on-surface">{calculations.laborCostPerUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between items-end pb-2">
                      <span className="text-on-surface-variant">Rateio Fixo</span>
                      <span className="font-label-md text-on-surface">{calculations.fixedCostPerUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  </div>
                </div>

                {/* Profit & Fees Breakdown */}
                <div className="bg-surface-container-lowest p-md rounded-3xl shadow-sticker border-2 border-surface-container space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container shadow-inner">
                        <span className="material-symbols-outlined">account_balance</span>
                      </div>
                      <h3 className="font-headline-sm text-on-surface">Composição Final</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-surface-container p-3 rounded-xl border border-surface-variant flex justify-between items-center">
                        <span className="font-label-md text-on-surface-variant">Taxas ({cardFeePercent}%)</span>
                        <span className="font-headline-sm text-error">{calculations.feeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                      
                      <div className="bg-secondary-fixed/30 p-3 rounded-xl border border-secondary/20 flex justify-between items-center">
                        <span className="font-label-md text-on-surface-variant">Lucro Líquido ({profitMarginPercent}%)</span>
                        <span className="font-headline-sm text-secondary font-bold">{calculations.profitAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center pt-2">
                    <p className="font-body-md text-on-surface-variant text-sm">
                      Ajuste as margens na aba ao lado para visualizar os impactos imediatamente.
                    </p>
                  </div>
                  </div>
                </div>

              {/* Save Pricing Section */}
              <div className="bg-surface-container-lowest p-lg rounded-3xl shadow-sticker border-2 border-primary-container space-y-4 flex flex-col md:flex-row items-center gap-6 justify-between">
                <div className="flex-1 w-full space-y-2">
                  <Label className="font-label-md text-on-surface-variant">Preço Final de Venda (R$) - Opcional</Label>
                  <Input 
                    className="bg-surface border-2 border-outline-variant font-body-md h-12 rounded-xl focus-visible:ring-primary-container text-lg font-bold text-primary placeholder:font-normal" 
                    type="text" 
                    inputMode="numeric" 
                    placeholder="Ex: 25,00 (Arredondamento)"
                    value={savedPrice} 
                    onChange={(e) => setSavedPrice(formatCurrencyInput(e.target.value))} 
                  />
                  <p className="text-xs text-on-surface-variant">Se deixar em branco, o <strong>Preço Sugerido</strong> será utilizado.</p>
                </div>
                
                <button 
                  onClick={handleSavePricing}
                  disabled={saving}
                  className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 bg-primary text-white font-bold text-[14px] px-8 py-3.5 rounded-[1.25rem] hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)] disabled:opacity-50 h-12 mt-6 md:mt-0"
                >
                  <span className="material-symbols-outlined text-[20px]">{saving ? 'sync' : 'save'}</span>
                  {saving ? 'Salvando...' : 'Salvar Precificação'}
                </button>
              </div>

            </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center rounded-[3rem] border-4 border-dashed border-surface-container bg-surface-container-lowest text-on-surface-variant p-lg text-center shadow-inner">
              <span className="material-symbols-outlined text-[56px] mb-6 opacity-30">calculate</span>
              <h3 className="font-headline-sm text-on-surface mb-2">Pronto para precificar?</h3>
              <p className="font-body-md max-w-sm">Selecione uma ficha técnica ao lado para visualizar os cálculos de precificação em tempo real.</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

