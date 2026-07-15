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
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');

  // Editable pricing fields
  const [packagingCost, setPackagingCost] = useState(formatCurrencyInput(0));
  const [laborHourValue, setLaborHourValue] = useState(formatCurrencyInput(0));
  const [fixedCostsMonthly, setFixedCostsMonthly] = useState(formatCurrencyInput(0));
  const [estimatedMonthlyProduction, setEstimatedMonthlyProduction] = useState('1');
  const [cardFeePercent, setCardFeePercent] = useState('0');
  const [profitMarginPercent, setProfitMarginPercent] = useState('0');

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
      
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const selectedRecipe = useMemo(() => {
    return recipes.find(r => r.id === selectedRecipeId);
  }, [recipes, selectedRecipeId]);

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

  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando precificação...</div>;

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Calculadora de Preços</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">Calcule o preço ideal para suas receitas garantindo lucro.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Settings and Recipe Selection */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-surface-container-lowest p-lg rounded-3xl shadow-sticker border-4 border-surface-container relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-fixed-dim opacity-20 blur-2xl -mr-10 -mt-10"></div>
            <h3 className="font-headline-sm text-on-surface mb-md relative z-10">1. Escolha a Receita</h3>
            <div className="relative z-10">
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
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
    </div>
  );
};

