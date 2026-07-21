import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { IngredientDialog, type Ingredient as BaseIngredient } from '@/components/IngredientDialog';

const getBaseUnitLabel = (unit: string) => {
  if (unit === 'kg' || unit === 'g') return 'g';
  if (unit === 'litro' || unit === 'ml') return 'ml';
  return 'un';
};

type Ingredient = {
  id: string;
  name: string;
  purchase_price: number;
  purchase_quantity: number;
  purchase_unit: string;
};

type RecipeIngredient = {
  id?: string;
  ingredient_id: string;
  quantity_used: number;
  ingredient_name?: string; // for UI
  unit_cost?: number; // for UI calculation
  purchase_unit?: string; // for UI
};

const getUnitCost = (price: number, qty: number, unit: string) => {
  if (!price || !qty) return 0;
  if (unit === 'kg' || unit === 'litro') return price / (qty * 1000);
  if (unit === 'duzia') return price / (qty * 12);
  return price / qty;
};

const StepEditor = ({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder: string;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <div 
      ref={editorRef}
      contentEditable
      className="flex-1 w-full bg-surface border-2 border-outline-variant font-body-md rounded-2xl p-4 focus-visible:border-primary-container focus-visible:ring-2 focus-visible:ring-primary-container/20 min-h-[100px] shadow-inner outline-none transition-all [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_b]:text-primary [&_strong]:text-primary empty:before:content-[attr(data-placeholder)] empty:before:text-on-surface-variant/50 pr-12"
      onInput={(e) => onChange(e.currentTarget.innerHTML)}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
      }}
      data-placeholder={placeholder}
      style={{ whiteSpace: 'pre-wrap' }}
    />
  );
};

export const RecipeForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== 'nova');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isReceita = location.pathname.includes('/receitas');
  const returnPath = isReceita ? '/receitas' : '/fichas-tecnicas';
  const entityName = isReceita ? 'Receita' : 'Ficha Técnica';

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);

  // Recipe Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [recipeYield, setRecipeYield] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions' | 'notes'>('ingredients');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Add State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      // Load available ingredients
      const { data: ingData } = await supabase
        .from('ingredients')
        .select('id, name, purchase_price, purchase_quantity, purchase_unit')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('name');
      if (ingData) setAvailableIngredients(ingData);

      // Load unique categories
      const { data: catData } = await supabase
        .from('recipes')
        .select('category')
        .eq('user_id', user.id);
      
      if (catData) {
        const uniqueCategories = Array.from(new Set(catData.map((r: any) => r.category).filter(Boolean)));
        setAvailableCategories(uniqueCategories);
      }

      if (isEditing && id) {
        // Load recipe
        const { data: recipeData } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();
          
        if (recipeData) {
          setName(recipeData.name);
          setCategory(recipeData.category || '');
          setRecipeYield(recipeData.yield.toString());
          setPrepTime(recipeData.prep_time_minutes.toString());
          setInstructions(recipeData.instructions ? recipeData.instructions.split('\n\n') : ['']);
          setNotes(recipeData.notes || '');
        }

        // Load recipe ingredients
        const { data: riData } = await supabase
          .from('recipe_ingredients')
          .select('id, ingredient_id, quantity_used, ingredients(name, purchase_price, purchase_quantity, purchase_unit)')
          .eq('recipe_id', id);
          
        if (riData) {
          const formatted = riData.map((ri: any) => ({
            id: ri.id,
            ingredient_id: ri.ingredient_id,
            quantity_used: ri.quantity_used,
            ingredient_name: ri.ingredients?.name,
            unit_cost: getUnitCost(ri.ingredients?.purchase_price, ri.ingredients?.purchase_quantity, ri.ingredients?.purchase_unit),
            purchase_unit: ri.ingredients?.purchase_unit,
          }));
          setRecipeIngredients(formatted);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [id, isEditing, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddIngredient = () => {
    setRecipeIngredients([
      ...recipeIngredients,
      { ingredient_id: '', quantity_used: 0 },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...recipeIngredients];
    if (field === 'ingredient_id') {
      const selected = availableIngredients.find(i => i.id === value);
      updated[index] = { 
        ...updated[index], 
        ingredient_id: value, 
        ingredient_name: selected?.name,
        unit_cost: selected ? getUnitCost(selected.purchase_price, selected.purchase_quantity, selected.purchase_unit) : 0,
        purchase_unit: selected?.purchase_unit
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setRecipeIngredients(updated);
  };

  const totalCost = recipeIngredients.reduce((total, ri) => {
    return total + ((ri.unit_cost || 0) * ri.quantity_used);
  }, 0);

  const handleSaveQuickAdd = (savedIngredient: BaseIngredient) => {
    // Converter de BaseIngredient (IngredientDialog) para o formato esperado localmente
    const mapped: Ingredient = {
      id: savedIngredient.id,
      name: savedIngredient.name,
      purchase_price: savedIngredient.purchase_price,
      purchase_quantity: savedIngredient.purchase_quantity,
      purchase_unit: savedIngredient.purchase_unit
    };
    
    setAvailableIngredients(prev => {
      // Se já existir, substitui (pode ser uma edição futura), senão adiciona
      const exists = prev.findIndex(i => i.id === mapped.id);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = mapped;
        return next;
      }
      return [...prev, mapped];
    });
    
    if (quickAddIndex !== null) {
      const updated = [...recipeIngredients];
      updated[quickAddIndex] = {
        ...updated[quickAddIndex],
        ingredient_id: mapped.id,
        ingredient_name: mapped.name,
        unit_cost: getUnitCost(mapped.purchase_price, mapped.purchase_quantity, mapped.purchase_unit),
        purchase_unit: mapped.purchase_unit
      };
      setRecipeIngredients(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate ingredients
    if (recipeIngredients.some(ri => !ri.ingredient_id || ri.quantity_used <= 0)) {
      alert('Por favor, preencha corretamente todos os ingredientes (selecione o ingrediente e a quantidade maior que 0).');
      return;
    }

    setSaving(true);
    let currentRecipeId = id;

    const recipeData = {
      user_id: user.id,
      name,
      category: category || 'Sem Categoria',
      yield: parseFloat(recipeYield),
      prep_time_minutes: parseInt(prepTime, 10),
      instructions: instructions.map(s => s.trim()).filter(Boolean).join('\n\n'),
      notes,
      updated_at: new Date().toISOString(),
    };

    if (isEditing && id) {
      await supabase.from('recipes').update(recipeData).eq('id', id);
    } else {
      const { data, error } = await supabase
        .from('recipes')
        .insert({ ...recipeData, created_at: new Date().toISOString() })
        .select()
        .single();
        
      if (error) {
        console.error(error);
        alert('Erro ao salvar receita');
        setSaving(false);
        return;
      }
      currentRecipeId = data.id;
    }

    // Handle Recipe Ingredients
    if (currentRecipeId) {
      if (isEditing) {
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', currentRecipeId);
      }
      
      if (recipeIngredients.length > 0) {
        const riData = recipeIngredients.map(ri => ({
          recipe_id: currentRecipeId,
          ingredient_id: ri.ingredient_id,
          quantity_used: ri.quantity_used,
        }));
        await supabase.from('recipe_ingredients').insert(riData);
      }
    }

    setSaving(false);
    navigate(returnPath);
  };

  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando ficha...</div>;

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(returnPath)} className="w-10 h-10 rounded-full bg-[#FDF0EC] flex items-center justify-center text-primary hover:bg-[#F8E4E0] transition-all">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">
              {isEditing ? `Editar ${entityName}` : `Nova ${entityName}`}
            </h2>
            <p className="font-label-md text-[12px] text-[#87655F]">
              Defina sua receita, ingredientes e acompanhe os custos reais.
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Details */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="bg-surface-container-lowest p-lg rounded-3xl shadow-sticker border-2 border-surface-container space-y-md">
              <h3 className="font-headline-sm text-on-surface mb-sm flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                Informações
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="font-label-md text-on-surface-variant">Nome da Receita *</Label>
                <Input 
                  id="name" 
                  className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ex: Bolo de Cenoura com Gotas"
                  required 
                />
              </div>
              
              <div className="space-y-2 relative" ref={categoryDropdownRef}>
                <Label htmlFor="category" className="font-label-md text-on-surface-variant">Categoria</Label>
                <Input 
                  id="category" 
                  className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" 
                  value={category} 
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setShowCategoryDropdown(true);
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setShowCategoryDropdown(false);
                      if (category.trim() && !availableCategories.find(c => c.toLowerCase() === category.trim().toLowerCase())) {
                        setAvailableCategories([...availableCategories, category.trim()]);
                      }
                    }
                  }}
                  placeholder="Buscar ou criar..."
                />
                {showCategoryDropdown && (
                  <div className="absolute top-[68px] left-0 w-full bg-surface-container-lowest border-2 border-outline-variant/50 rounded-2xl shadow-sticker z-[100] max-h-48 overflow-y-auto p-1">
                    {availableCategories.filter(cat => cat.toLowerCase().includes(category.toLowerCase())).length > 0 ? (
                      availableCategories
                        .filter(cat => cat.toLowerCase().includes(category.toLowerCase()))
                        .map(cat => (
                          <div 
                            key={cat} 
                            className="px-3 py-2 hover:bg-secondary-container hover:text-on-secondary-container rounded-xl cursor-pointer font-body-md text-on-surface transition-colors"
                            onClick={() => {
                              setCategory(cat);
                              setShowCategoryDropdown(false);
                            }}
                          >
                            {cat}
                          </div>
                        ))
                    ) : null}
                    
                    {category.trim() && !availableCategories.find(c => c.toLowerCase() === category.trim().toLowerCase()) && (
                      <div 
                        className="px-3 py-2 bg-primary-container/20 text-primary hover:bg-primary-container hover:text-on-primary-container rounded-xl cursor-pointer font-body-md font-bold transition-colors flex items-center gap-2"
                        onClick={() => {
                          if (category.trim() && !availableCategories.find(c => c.toLowerCase() === category.trim().toLowerCase())) {
                            setAvailableCategories([...availableCategories, category.trim()]);
                          }
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        Criar "{category}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yield" className="font-label-md text-on-surface-variant">Rendimento</Label>
                  <Input 
                    id="yield" 
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" 
                    value={recipeYield} 
                    onChange={(e) => setRecipeYield(e.target.value)} 
                    placeholder="Qtd"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prepTime" className="font-label-md text-on-surface-variant">Tempo (min)</Label>
                  <Input 
                    id="prepTime" 
                    type="number" 
                    step="1" 
                    min="1" 
                    className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" 
                    value={prepTime} 
                    onChange={(e) => setPrepTime(e.target.value)} 
                    placeholder="Minutos"
                    required 
                  />
                </div>
              </div>
            </div>
            
            {/* Total Cost Summary Card */}
            <div className="bg-primary-container/20 p-lg rounded-3xl shadow-sticker border-2 border-primary-container flex flex-col items-center text-center overflow-hidden relative group">
              <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>
              <span className="font-label-md text-on-surface-variant mb-2 relative z-10 uppercase tracking-wider">Custo Total dos Ingredientes</span>
              <span className="font-display-lg text-primary relative z-10">{totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              {recipeYield && parseFloat(recipeYield) > 0 && (
                <span className="font-label-sm text-on-surface-variant mt-2 relative z-10 bg-surface-container-lowest px-3 py-1 rounded-full shadow-sm">
                  ≈ {(totalCost / parseFloat(recipeYield)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / porção
                </span>
              )}
            </div>
          </div>

          {/* Right Column: Content Tabs */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-surface-container-lowest p-lg rounded-3xl border-2 border-surface-container shadow-sticker flex flex-col flex-1 min-h-[500px]">
              
              <div className="flex gap-2 sm:gap-4 mb-6 pb-4 border-b-2 border-surface-container border-dashed overflow-x-auto snap-x hide-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('ingredients')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-label-md whitespace-nowrap transition-all snap-start flex items-center gap-2 ${activeTab === 'ingredients' ? 'bg-secondary-fixed text-on-secondary-fixed shadow-sm font-bold' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">grocery</span>
                  Ingredientes ({recipeIngredients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('instructions')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-label-md whitespace-nowrap transition-all snap-start flex items-center gap-2 ${activeTab === 'instructions' ? 'bg-secondary-fixed text-on-secondary-fixed shadow-sm font-bold' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">restaurant_menu</span>
                  Modo de Preparo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full font-label-md whitespace-nowrap transition-all snap-start flex items-center gap-2 ${activeTab === 'notes' ? 'bg-secondary-fixed text-on-secondary-fixed shadow-sm font-bold' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  Informações
                </button>
              </div>

              <div className="flex-1 flex flex-col">
                {activeTab === 'ingredients' && (
                  <div className="space-y-4 flex-1 flex flex-col">
                    {recipeIngredients.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-on-surface-variant py-xl">
                    <span className="material-symbols-outlined text-6xl opacity-30 mb-4">blender</span>
                    <p className="font-body-md text-center max-w-sm">
                      Nenhum ingrediente adicionado. Adicione para calcular os custos reais da sua receita.
                    </p>
                  </div>
                ) : (
                  recipeIngredients.map((ri, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-end sm:items-center gap-4 rounded-2xl border-2 border-surface-container p-4 bg-surface-container-low group hover:border-primary-container hover:shadow-sm transition-all">
                      <div className="flex-1 w-full space-y-2">
                        <Label className="font-label-md text-on-surface-variant">Ingrediente</Label>
                        <div className="flex gap-2">
                          <Select 
                            value={ri.ingredient_id} 
                            onValueChange={(val) => handleIngredientChange(index, 'ingredient_id', val)}
                          >
                            <SelectTrigger className="flex-1 bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus:ring-primary-container">
                              <SelectValue placeholder="Selecione um item...">
                                {ri.ingredient_name}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-2 border-outline-variant">
                              {availableIngredients.map(ing => (
                                <SelectItem key={ing.id} value={ing.id}>
                                  {ing.name} ({getUnitCost(ing.purchase_price, ing.purchase_quantity, ing.purchase_unit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })} por {ing.purchase_unit === 'kg' || ing.purchase_unit === 'g' ? 'g' : ing.purchase_unit === 'litro' || ing.purchase_unit === 'ml' ? 'ml' : 'un'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button 
                            type="button" 
                            onClick={() => {
                              setQuickAddIndex(index);
                              setQuickAddOpen(true);
                            }} 
                            className="w-10 h-10 shrink-0 bg-primary-container text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
                            title="Criar novo ingrediente"
                          >
                            <Plus size={24} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-32 space-y-2">
                        <Label className="font-label-md text-on-surface-variant">Qtd Usada</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            className={`bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container ${ri.purchase_unit ? 'pr-10' : ''}`}
                            value={ri.quantity_used || ''} 
                            onChange={(e) => handleIngredientChange(index, 'quantity_used', parseFloat(e.target.value) || 0)} 
                            placeholder={ri.purchase_unit ? '' : 'g/ml/un'}
                          />
                          {ri.purchase_unit && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-sm font-bold opacity-70 pointer-events-none">
                              {getBaseUnitLabel(ri.purchase_unit)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-auto flex justify-between sm:justify-end items-center sm:block mt-2 sm:mt-0 pt-4 sm:pt-0 border-t-2 sm:border-0 border-surface-container border-dashed">
                        <span className="sm:hidden font-headline-sm text-primary">
                          {ri.ingredient_id ? ((ri.unit_cost || 0) * ri.quantity_used).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'}) : 'R$ 0,00'}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          <span className="hidden sm:block font-label-md text-primary bg-primary-container/20 px-2 py-1 rounded-md mb-2">
                            {ri.ingredient_id ? ((ri.unit_cost || 0) * ri.quantity_used).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'}) : 'R$ 0,00'}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveIngredient(index)}
                            className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container bg-surface rounded-full transition-colors shadow-sm border border-outline-variant/30"
                            title="Remover"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                    <div className="mt-4 flex justify-start">
                      <button 
                        type="button" 
                        onClick={handleAddIngredient}
                        className="flex items-center justify-center gap-2 bg-surface hover:bg-surface-container-low text-on-surface-variant hover:text-primary font-label-md px-6 py-3 rounded-full border-2 border-dashed border-outline-variant transition-all active:scale-95 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Adicionar Ingrediente
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'instructions' && (
                  <div className="flex-1 flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Label className="font-label-lg text-on-surface">Passo a passo da receita</Label>
                    <div className="flex items-center gap-2 -mt-2 mb-2">
                      <p className="font-body-md text-on-surface-variant">Descreva detalhadamente as etapas de preparo desta receita.</p>
                      <div className="relative group">
                        <div className="w-5 h-5 rounded-full bg-surface-container-high hover:bg-primary-container text-on-surface-variant hover:text-on-primary-container flex items-center justify-center cursor-help transition-colors">
                          <span className="material-symbols-outlined text-[14px]">help</span>
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-[240px] bg-[#f4ecea] text-on-surface p-4 rounded-2xl shadow-[0_8px_30px_rgba(159,64,45,0.15)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 text-sm border border-[#e8d5d1] pointer-events-none">
                          <p className="font-bold mb-3 text-primary">Atalhos de formatação:</p>
                          <ul className="space-y-2.5">
                            <li className="flex items-center gap-1.5 text-on-surface-variant"><kbd className="bg-white px-2 py-1 rounded-md border border-[#e8d5d1] shadow-sm text-[11px] font-bold text-[#4a322b]">Ctrl</kbd> + <kbd className="bg-white px-2 py-1 rounded-md border border-[#e8d5d1] shadow-sm text-[11px] font-bold text-[#4a322b]">B</kbd> : Negrito</li>
                            <li className="flex items-center gap-1.5 text-on-surface-variant"><kbd className="bg-white px-2 py-1 rounded-md border border-[#e8d5d1] shadow-sm text-[11px] font-bold text-[#4a322b]">Ctrl</kbd> + <kbd className="bg-white px-2 py-1 rounded-md border border-[#e8d5d1] shadow-sm text-[11px] font-bold text-[#4a322b]">I</kbd> : Itálico</li>
                            <li className="flex items-center gap-1.5 text-on-surface-variant"><kbd className="bg-white px-2 py-1 rounded-md border border-[#e8d5d1] shadow-sm text-[11px] font-bold text-[#4a322b]">Ctrl</kbd> + <kbd className="bg-white px-2 py-1 rounded-md border border-[#e8d5d1] shadow-sm text-[11px] font-bold text-[#4a322b]">U</kbd> : Sublinhado</li>
                          </ul>
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#f4ecea]"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      {instructions.map((step, index) => (
                        <div key={index} className="flex gap-4 items-start relative group">
                          <div className="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-bold text-sm shrink-0 mt-2 shadow-inner">
                            {index + 1}
                          </div>
                          <StepEditor 
                            placeholder={index === 0 ? "Ex: Bata os ovos com o açúcar..." : "Descreva a próxima etapa..."}
                            value={step}
                            onChange={(val) => {
                              const newSteps = [...instructions];
                              newSteps[index] = val;
                              setInstructions(newSteps);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newSteps = instructions.filter((_, i) => i !== index);
                              setInstructions(newSteps.length > 0 ? newSteps : ['']);
                            }}
                            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-surface hover:bg-error-container text-on-surface-variant hover:text-error rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-outline-variant"
                            title="Remover etapa"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-start">
                      <button
                        type="button"
                        onClick={() => setInstructions([...instructions, ''])}
                        className="flex items-center justify-center gap-2 bg-surface hover:bg-surface-container-low text-on-surface-variant hover:text-primary font-label-md px-6 py-3 rounded-full border-2 border-dashed border-outline-variant transition-all active:scale-95 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Nova Etapa
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="flex-1 flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Label htmlFor="notes" className="font-label-lg text-on-surface">Informações Adicionais</Label>
                    <p className="font-body-md text-on-surface-variant -mt-2 mb-2">Registre dicas, tempos de validade, opções de substituição, etc.</p>
                    <textarea 
                      id="notes"
                      className="flex-1 w-full bg-surface border-2 border-outline-variant font-body-md rounded-2xl p-4 focus-visible:border-primary-container focus-visible:ring-2 focus-visible:ring-primary-container/20 min-h-[300px] resize-y shadow-inner outline-none"
                      placeholder="Ex:&#10;- Validade: 5 dias em temperatura ambiente.&#10;- Pode ser congelado por até 3 meses.&#10;- Para versão sem lactose, substitua o leite por bebida de amêndoas."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t-2 border-surface-container border-dashed flex justify-end items-center">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary font-label-md px-8 py-4 rounded-full shadow-sticker hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 border-2 border-transparent"
                >
                  <span className="material-symbols-outlined">{saving ? 'sync' : 'save'}</span>
                  {saving ? 'Salvando...' : 'Salvar Ficha Completa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Add Ingredient Modal */}
      <IngredientDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSave={handleSaveQuickAdd}
      />
    </div>
  );
};

