import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  base_unit_cost: number;
  purchase_unit: string;
};

type RecipeIngredient = {
  id?: string;
  ingredient_id: string;
  quantity_used: number;
  ingredient_name?: string; // for UI
  base_unit_cost?: number; // for UI calculation
  purchase_unit?: string; // for UI
};

export const RecipeForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== 'nova');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);

  // Recipe Fields
  const [name, setName] = useState('');
  const [recipeYield, setRecipeYield] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions' | 'notes'>('ingredients');

  // Quick Add State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      // Load available ingredients
      const { data: ingData } = await supabase
        .from('ingredients')
        .select('id, name, base_unit_cost, purchase_unit')
        .eq('user_id', user.id)
        .order('name');
        
      if (ingData) setAvailableIngredients(ingData);

      if (isEditing && id) {
        // Load recipe
        const { data: recipeData } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();
          
        if (recipeData) {
          setName(recipeData.name);
          setRecipeYield(recipeData.yield.toString());
          setPrepTime(recipeData.prep_time_minutes.toString());
          setInstructions(recipeData.instructions || '');
          setNotes(recipeData.notes || '');
          setImageUrl(recipeData.image_url || '');
          setImagePreview(recipeData.image_url || '');
        }

        // Load recipe ingredients
        const { data: riData } = await supabase
          .from('recipe_ingredients')
          .select('id, ingredient_id, quantity_used, ingredients(name, base_unit_cost, purchase_unit)')
          .eq('recipe_id', id);
          
        if (riData) {
          const formatted = riData.map((ri: any) => ({
            id: ri.id,
            ingredient_id: ri.ingredient_id,
            quantity_used: ri.quantity_used,
            ingredient_name: ri.ingredients.name,
            base_unit_cost: ri.ingredients.base_unit_cost,
            purchase_unit: ri.ingredients.purchase_unit,
          }));
          setRecipeIngredients(formatted);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [user, id, isEditing]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

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
        base_unit_cost: Number(selected?.base_unit_cost) || 0,
        purchase_unit: selected?.purchase_unit
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setRecipeIngredients(updated);
  };

  const totalCost = recipeIngredients.reduce((total, ri) => {
    return total + ((ri.base_unit_cost || 0) * ri.quantity_used);
  }, 0);

  const handleSaveQuickAdd = (savedIngredient: BaseIngredient) => {
    // Converter de BaseIngredient (IngredientDialog) para o formato esperado localmente
    const mapped: Ingredient = {
      id: savedIngredient.id,
      name: savedIngredient.name,
      base_unit_cost: Number(savedIngredient.base_unit_cost) || 0,
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
        base_unit_cost: mapped.base_unit_cost,
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
    let finalImageUrl = imageUrl;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(filePath, imageFile);
        
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('recipe-images')
          .getPublicUrl(filePath);
        finalImageUrl = publicUrlData.publicUrl;
      }
    }

    const recipeData = {
      user_id: user.id,
      name,
      yield: parseFloat(recipeYield),
      prep_time_minutes: parseInt(prepTime, 10),
      instructions,
      notes,
      image_url: finalImageUrl,
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
    navigate('/receitas');
  };

  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando ficha...</div>;

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/receitas')} className="w-10 h-10 rounded-full bg-[#FDF0EC] flex items-center justify-center text-primary hover:bg-[#F8E4E0] transition-all">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">
              {isEditing ? 'Editar Ficha Técnica' : 'Nova Ficha Técnica'}
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
            {/* Image Upload Card */}
            <div className="bg-surface-container-lowest rounded-3xl shadow-sticker border-2 border-surface-container overflow-hidden group relative">
              <div className="aspect-square bg-surface-container-low flex flex-col items-center justify-center relative overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-on-surface-variant opacity-50 p-6 text-center">
                    <span className="material-symbols-outlined text-[32px] mb-2">add_photo_alternate</span>
                    <p className="font-label-md">Nenhuma foto adicionada</p>
                  </div>
                )}
                
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="bg-surface/90 text-on-surface px-4 py-2 rounded-full font-label-md shadow-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    {imagePreview ? 'Trocar Foto' : 'Fazer Upload'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
            </div>

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
                                  {ing.name} ({Number(ing.base_unit_cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })} por {ing.purchase_unit === 'kg' || ing.purchase_unit === 'g' ? 'g' : ing.purchase_unit === 'litro' || ing.purchase_unit === 'ml' ? 'ml' : 'un'})
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
                          {ri.ingredient_id ? ((ri.base_unit_cost || 0) * ri.quantity_used).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'}) : 'R$ 0,00'}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          <span className="hidden sm:block font-label-md text-primary bg-primary-container/20 px-2 py-1 rounded-md mb-2">
                            {ri.ingredient_id ? ((ri.base_unit_cost || 0) * ri.quantity_used).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'}) : 'R$ 0,00'}
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
                    <Label htmlFor="instructions" className="font-label-lg text-on-surface">Passo a passo da receita</Label>
                    <p className="font-body-md text-on-surface-variant -mt-2 mb-2">Descreva detalhadamente como preparar esta receita.</p>
                    <textarea 
                      id="instructions"
                      className="flex-1 w-full bg-surface border-2 border-outline-variant font-body-md rounded-2xl p-4 focus-visible:border-primary-container focus-visible:ring-2 focus-visible:ring-primary-container/20 min-h-[300px] resize-y shadow-inner outline-none"
                      placeholder="Ex:&#10;1. Bata os ovos com o açúcar até formar um creme fofo...&#10;2. Adicione a farinha aos poucos..."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
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

