import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { IngredientDialog } from '@/components/IngredientDialog';
import { useRecipes, recipeSchema, type RecipeFormInput, type RecipeFormValues } from '@/hooks/useRecipes';
import { useIngredients } from '@/hooks/useIngredients';
import { getUnitCost } from '@/lib/utils';

const getBaseUnitLabel = (unit: string) => {
  if (unit === 'kg' || unit === 'g') return 'g';
  if (unit === 'litro' || unit === 'ml') return 'ml';
  return 'un';
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
  const navigate = useNavigate();
  const location = useLocation();

  const isReceita = location.pathname.includes('/receitas');
  const returnPath = isReceita ? '/receitas' : '/fichas-tecnicas';
  const entityName = isReceita ? 'Receita' : 'Ficha Técnica';

  const { recipes, isLoading: recipesLoading, saveRecipe } = useRecipes();
  const { ingredients: availableIngredients } = useIngredients();

  const existingRecipe = isEditing ? recipes.find(r => r.id === id) ?? null : null;

  // Free-form fields kept outside RHF (contentEditable steps / plain notes), merged at submit.
  const [instructions, setInstructions] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (existingRecipe) {
      setInstructions(existingRecipe.instructions ? existingRecipe.instructions.split('\n\n') : ['']);
      setNotes(existingRecipe.notes || '');
    }
    // Only re-sync when navigating to a different recipe, not on every background refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRecipe?.id]);

  // UI State
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions' | 'notes'>('ingredients');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Add State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddIndex, setQuickAddIndex] = useState<number | null>(null);

  const availableCategories = useMemo(
    () => Array.from(new Set(recipes.map(r => r.category).filter(Boolean))),
    [recipes]
  );

  const defaultValues: RecipeFormInput = existingRecipe
    ? {
        name: existingRecipe.name,
        category: existingRecipe.category || '',
        yield: existingRecipe.yield,
        prep_time_minutes: existingRecipe.prep_time_minutes,
        recipe_ingredients: existingRecipe.recipe_ingredients.map(ri => ({
          ingredient_id: ri.ingredients?.id || '',
          quantity_used: ri.quantity_used,
        })),
      }
    : {
        name: '',
        category: '',
        yield: '',
        prep_time_minutes: '',
        recipe_ingredients: [],
      };

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecipeFormInput, unknown, RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    values: defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'recipe_ingredients' });
  const watchedIngredients = useWatch({ control, name: 'recipe_ingredients' }) || [];
  const watchedYield = useWatch({ control, name: 'yield' });
  const watchedCategory = useWatch({ control, name: 'category' });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalCost = useMemo(() => {
    return watchedIngredients.reduce((total, ri) => {
      const ing = availableIngredients.find(i => i.id === ri?.ingredient_id);
      if (!ing) return total;
      const unitCost = getUnitCost(ing.purchase_price, ing.purchase_quantity, ing.purchase_unit);
      return total + unitCost * (Number(ri?.quantity_used) || 0);
    }, 0);
  }, [watchedIngredients, availableIngredients]);

  const handleSaveQuickAdd = (savedIngredient: { id: string }) => {
    if (quickAddIndex !== null) {
      setValue(`recipe_ingredients.${quickAddIndex}.ingredient_id`, savedIngredient.id);
    }
  };

  const onSubmit = async (values: RecipeFormValues) => {
    const joinedInstructions = instructions.map(s => s.trim()).filter(Boolean).join('\n\n');
    await saveRecipe.mutateAsync({
      id: isEditing ? id : undefined,
      values: { ...values, instructions: joinedInstructions, notes },
    });
    navigate(returnPath);
  };

  if (isEditing && (recipesLoading || !existingRecipe)) {
    return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando ficha...</div>;
  }

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

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex-1">
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
                  placeholder="Ex: Bolo de Cenoura com Gotas"
                  aria-invalid={!!errors.name}
                  {...register('name')}
                />
                {errors.name && <p className="text-[12px] text-error">{errors.name.message}</p>}
              </div>

              <div className="space-y-2 relative" ref={categoryDropdownRef}>
                <Label htmlFor="category" className="font-label-md text-on-surface-variant">Categoria</Label>
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Input
                      id="category"
                      className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container"
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        setShowCategoryDropdown(true);
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setShowCategoryDropdown(false);
                        }
                      }}
                      placeholder="Buscar ou criar..."
                    />
                  )}
                />
                {showCategoryDropdown && (
                  <div className="absolute top-[68px] left-0 w-full bg-surface-container-lowest border-2 border-outline-variant/50 rounded-2xl shadow-sticker z-[100] max-h-48 overflow-y-auto p-1">
                    {availableCategories.filter(cat => cat.toLowerCase().includes((watchedCategory || '').toLowerCase())).map(cat => (
                      <div
                        key={cat}
                        className="px-3 py-2 hover:bg-secondary-container hover:text-on-secondary-container rounded-xl cursor-pointer font-body-md text-on-surface transition-colors"
                        onClick={() => {
                          setValue('category', cat);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        {cat}
                      </div>
                    ))}

                    {watchedCategory?.trim() && !availableCategories.find(c => c.toLowerCase() === watchedCategory.trim().toLowerCase()) && (
                      <div
                        className="px-3 py-2 bg-primary-container/20 text-primary hover:bg-primary-container hover:text-on-primary-container rounded-xl cursor-pointer font-body-md font-bold transition-colors flex items-center gap-2"
                        onClick={() => setShowCategoryDropdown(false)}
                      >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        Criar "{watchedCategory}"
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
                    placeholder="Qtd"
                    aria-invalid={!!errors.yield}
                    {...register('yield')}
                  />
                  {errors.yield && <p className="text-[12px] text-error">{errors.yield.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prepTime" className="font-label-md text-on-surface-variant">Tempo (min)</Label>
                  <Input
                    id="prepTime"
                    type="number"
                    step="1"
                    min="1"
                    className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container"
                    placeholder="Minutos"
                    aria-invalid={!!errors.prep_time_minutes}
                    {...register('prep_time_minutes')}
                  />
                  {errors.prep_time_minutes && <p className="text-[12px] text-error">{errors.prep_time_minutes.message}</p>}
                </div>
              </div>
            </div>

            {/* Total Cost Summary Card */}
            <div className="bg-primary-container/20 p-lg rounded-3xl shadow-sticker border-2 border-primary-container flex flex-col items-center text-center overflow-hidden relative group">
              <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>
              <span className="font-label-md text-on-surface-variant mb-2 relative z-10 uppercase tracking-wider">Custo Total dos Ingredientes</span>
              <span className="font-display-lg text-primary relative z-10">{totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              {Number(watchedYield) > 0 && (
                <span className="font-label-sm text-on-surface-variant mt-2 relative z-10 bg-surface-container-lowest px-3 py-1 rounded-full shadow-sm">
                  ≈ {(totalCost / Number(watchedYield)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / porção
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
                  Ingredientes ({fields.length})
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
                    {fields.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-on-surface-variant py-xl">
                    <span className="material-symbols-outlined text-6xl opacity-30 mb-4">blender</span>
                    <p className="font-body-md text-center max-w-sm">
                      Nenhum ingrediente adicionado. Adicione para calcular os custos reais da sua receita.
                    </p>
                  </div>
                ) : (
                  fields.map((field, index) => {
                    const rowIngredientId = watchedIngredients[index]?.ingredient_id;
                    const rowQty = Number(watchedIngredients[index]?.quantity_used) || 0;
                    const selectedIngredient = availableIngredients.find(i => i.id === rowIngredientId);
                    const unitCost = selectedIngredient
                      ? getUnitCost(selectedIngredient.purchase_price, selectedIngredient.purchase_quantity, selectedIngredient.purchase_unit)
                      : 0;
                    const rowError = errors.recipe_ingredients?.[index];

                    return (
                    <div key={field.id} className="flex flex-col sm:flex-row items-end sm:items-center gap-4 rounded-2xl border-2 border-surface-container p-4 bg-surface-container-low group hover:border-primary-container hover:shadow-sm transition-all">
                      <div className="flex-1 w-full space-y-2">
                        <Label className="font-label-md text-on-surface-variant">Ingrediente</Label>
                        <div className="flex gap-2">
                          <Controller
                            control={control}
                            name={`recipe_ingredients.${index}.ingredient_id`}
                            render={({ field: selectField }) => (
                              <Select
                                value={selectField.value}
                                onValueChange={(val) => selectField.onChange(val || '')}
                              >
                                <SelectTrigger className="flex-1 bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus:ring-primary-container">
                                  <SelectValue placeholder="Selecione um item...">
                                    {selectedIngredient?.name}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2 border-outline-variant">
                                  {availableIngredients.map(ing => (
                                    <SelectItem key={ing.id} value={ing.id}>
                                      {ing.name} ({getUnitCost(ing.purchase_price, ing.purchase_quantity, ing.purchase_unit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })} por {getBaseUnitLabel(ing.purchase_unit)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
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
                        {rowError?.ingredient_id && <p className="text-[12px] text-error">{rowError.ingredient_id.message}</p>}
                      </div>

                      <div className="w-full sm:w-32 space-y-2">
                        <Label className="font-label-md text-on-surface-variant">Qtd Usada</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container ${selectedIngredient?.purchase_unit ? 'pr-10' : ''}`}
                            placeholder={selectedIngredient?.purchase_unit ? '' : 'g/ml/un'}
                            {...register(`recipe_ingredients.${index}.quantity_used`)}
                          />
                          {selectedIngredient?.purchase_unit && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-body-sm font-bold opacity-70 pointer-events-none">
                              {getBaseUnitLabel(selectedIngredient.purchase_unit)}
                            </span>
                          )}
                        </div>
                        {rowError?.quantity_used && <p className="text-[12px] text-error">{rowError.quantity_used.message}</p>}
                      </div>

                      <div className="w-full sm:w-auto flex justify-between sm:justify-end items-center sm:block mt-2 sm:mt-0 pt-4 sm:pt-0 border-t-2 sm:border-0 border-surface-container border-dashed">
                        <span className="sm:hidden font-headline-sm text-primary">
                          {rowIngredientId ? (unitCost * rowQty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'}) : 'R$ 0,00'}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          <span className="hidden sm:block font-label-md text-primary bg-primary-container/20 px-2 py-1 rounded-md mb-2">
                            {rowIngredientId ? (unitCost * rowQty).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL'}) : 'R$ 0,00'}
                          </span>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container bg-surface rounded-full transition-colors shadow-sm border border-outline-variant/30"
                            title="Remover"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
                    <div className="mt-4 flex justify-start">
                      <button
                        type="button"
                        onClick={() => append({ ingredient_id: '', quantity_used: 0 })}
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
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary font-label-md px-8 py-4 rounded-full shadow-sticker hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 border-2 border-transparent"
                >
                  <span className="material-symbols-outlined">{isSubmitting ? 'sync' : 'save'}</span>
                  {isSubmitting ? 'Salvando...' : 'Salvar Ficha Completa'}
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
