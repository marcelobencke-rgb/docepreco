import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CashCategoryDialog, type CashCategory } from '@/components/CashCategoryDialog';
import { CashTransactionDialog, type CashTransaction } from '@/components/CashTransactionDialog';

export const CashFlow = () => {
  const { user } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState<'resumo' | 'extrato'>('resumo');

  // Date Range State
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Extrato
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todas');

  // Dialogs
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CashTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const isSeeding = useRef(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user?.id, startDate, endDate]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // 1. Load Categories
    const { data: cats, error: catsError } = await supabase
      .from('cash_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
      
    let currentCategories = cats || [];
    
    // Seed default categories if none exist
    if (!catsError && currentCategories.length === 0 && !isSeeding.current) {
      isSeeding.current = true;
      const defaultCategories = [
        { user_id: user.id, name: 'Vendas', type: 'income' },
        { user_id: user.id, name: 'Ingredientes', type: 'expense' },
        { user_id: user.id, name: 'Embalagens', type: 'expense' },
        { user_id: user.id, name: 'Água / Luz', type: 'expense' },
        { user_id: user.id, name: 'Transporte', type: 'expense' }
      ];
      
      const { data: insertedCats } = await supabase
        .from('cash_categories')
        .insert(defaultCategories)
        .select('*');
        
      if (insertedCats) {
        currentCategories = insertedCats.sort((a, b) => a.name.localeCompare(b.name));
      }
    }
    
    setCategories(currentCategories as CashCategory[]);

    // 2. Load Transactions for the selected period
    const { data: trans } = await supabase
      .from('cash_transactions')
      .select('*, cash_categories(name)')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    setTransactions(trans || []);
    setLoading(false);
  };

  const handleDeleteTransactionClick = (id: string) => {
    setTransactionToDelete(id);
  };

  const confirmDeleteTransaction = async () => {
    if (!user || !transactionToDelete) return;
    await supabase.from('cash_transactions').delete().eq('id', transactionToDelete).eq('user_id', user.id);
    setTransactionToDelete(null);
    loadData();
  };

  // Calculations for Resumo
  const { totalIncome, totalExpense, balance, categoriesSummary } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const catSummary: Record<string, { name: string, type: 'income' | 'expense', amount: number }> = {};

    transactions.forEach(t => {
      const amount = Number(t.amount);
      if (t.type === 'income') inc += amount;
      else exp += amount;

      const catName = t.cash_categories?.name || 'Sem Categoria';
      const key = `${t.type}-${catName}`;
      
      if (!catSummary[key]) {
        catSummary[key] = { name: catName, type: t.type, amount: 0 };
      }
      catSummary[key].amount += amount;
    });

    const summaryArray = Object.values(catSummary).sort((a, b) => b.amount - a.amount);

    return {
      totalIncome: inc,
      totalExpense: exp,
      balance: inc - exp,
      categoriesSummary: summaryArray
    };
  }, [transactions]);

  // Filters for Extrato
  const filteredTransactions = transactions.filter(t => {
    const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'todos' || t.type === typeFilter;
    const matchCategory = categoryFilter === 'todas' || t.category_id === categoryFilter;
    return matchSearch && matchType && matchCategory;
  });

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Caixa</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">Controle suas entradas e saídas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsCategoryDialogOpen(true)}
            className="flex items-center justify-center gap-2 bg-surface text-on-surface-variant font-bold text-[13px] px-4 py-2.5 rounded-[1.25rem] hover:bg-surface-container-high transition-all border-2 border-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px]">category</span>
            Categorias
          </button>
          <button 
            onClick={() => { setEditingTransaction(null); setIsTransactionDialogOpen(true); }}
            className="flex items-center justify-center gap-2 bg-primary text-white font-bold text-[13px] px-4 py-2.5 rounded-[1.25rem] hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo Lançamento
          </button>
        </div>
      </header>

      {/* Tabs & Month Selector */}
      <div className="flex flex-col md:flex-row justify-between border-b-2 border-surface-container mb-6 gap-4 md:gap-0 pb-3 md:pb-0">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('resumo')} 
            className={`pb-3 font-label-md uppercase tracking-wider relative transition-colors ${activeTab === 'resumo' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Resumo
            {activeTab === 'resumo' && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-primary rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('extrato')} 
            className={`pb-3 font-label-md uppercase tracking-wider relative transition-colors ${activeTab === 'extrato' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            Extrato
            {activeTab === 'extrato' && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-primary rounded-t-full"></div>}
          </button>
        </div>
        
        <div className="flex items-center gap-2 md:pb-2">
          <Input 
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-10 min-w-[130px] md:w-[140px]"
          />
          <span className="text-on-surface-variant font-medium text-[14px]">até</span>
          <Input 
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-10 min-w-[130px] md:w-[140px]"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-10">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : activeTab === 'resumo' ? (
          <div className="space-y-6">
            {/* Total Cards */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 bg-surface-container-lowest p-6 rounded-3xl border-2 border-surface-container shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Entradas</p>
                <p className="text-[28px] font-display-sm text-primary font-bold">
                  {totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="flex-1 bg-surface-container-lowest p-6 rounded-3xl border-2 border-surface-container shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Saídas</p>
                <p className="text-[28px] font-display-sm text-error font-bold">
                  {totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className={`flex-1 p-6 rounded-3xl border-2 shadow-sm flex flex-col justify-center items-center text-center ${balance >= 0 ? 'bg-primary-container/30 border-primary/20' : 'bg-error-container/30 border-error/20'}`}>
                <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Saldo do Período</p>
                <p className={`text-[28px] font-display-sm font-bold ${balance >= 0 ? 'text-primary' : 'text-error'}`}>
                  {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>

            {/* Categories Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="bg-surface-container-lowest rounded-3xl border-2 border-surface-container p-6">
                <h3 className="font-headline-sm text-primary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                  Entradas por Categoria
                </h3>
                <div className="space-y-3">
                  {categoriesSummary.filter(c => c.type === 'income').length === 0 ? (
                    <p className="text-[13px] text-on-surface-variant text-center py-4">Nenhuma entrada no período.</p>
                  ) : (
                    categoriesSummary.filter(c => c.type === 'income').map((cat, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-surface-container-low pb-2 last:border-0 last:pb-0">
                        <span className="font-medium text-[14px]">{cat.name}</span>
                        <span className="font-bold text-primary">{cat.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-3xl border-2 border-surface-container p-6">
                <h3 className="font-headline-sm text-error mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                  Saídas por Categoria
                </h3>
                <div className="space-y-3">
                  {categoriesSummary.filter(c => c.type === 'expense').length === 0 ? (
                    <p className="text-[13px] text-on-surface-variant text-center py-4">Nenhuma saída no período.</p>
                  ) : (
                    categoriesSummary.filter(c => c.type === 'expense').map((cat, idx) => (
                      <div key={idx} className="flex justify-between items-center border-b border-surface-container-low pb-2 last:border-0 last:pb-0">
                        <span className="font-medium text-[14px]">{cat.name}</span>
                        <span className="font-bold text-error">{cat.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
              <div className="relative flex-1 w-full">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] z-10">search</span>
                <Input 
                  type="text" 
                  placeholder="Buscar lançamento..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12"
                />
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <div className="w-full md:w-48">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      <SelectItem value="income">Entradas</SelectItem>
                      <SelectItem value="expense">Saídas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-48">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
                      <SelectValue placeholder="Todas categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas categorias</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-3">
              {filteredTransactions.length === 0 ? (
                <div className="py-xl flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-lowest rounded-3xl border-2 border-dashed border-surface-container">
                  <span className="material-symbols-outlined text-6xl mb-4 opacity-50">receipt_long</span>
                  <p className="font-body-md text-center max-w-md">Nenhum lançamento encontrado.</p>
                </div>
              ) : (
                filteredTransactions.map(t => (
                  <div key={t.id} className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between border-2 border-surface-container gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`material-symbols-outlined text-[18px] ${t.type === 'income' ? 'text-primary' : 'text-error'}`}>
                          {t.type === 'income' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                        <h4 className="font-bold text-[15px]">{t.description}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-on-surface-variant pl-7">
                        <span>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span className="bg-surface px-2 py-0.5 rounded-md border border-outline-variant/30">{t.cash_categories?.name || 'Sem categoria'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between w-full md:w-auto gap-4 pl-7 md:pl-0">
                      <span className={`font-bold text-[16px] ${t.type === 'income' ? 'text-primary' : 'text-error'}`}>
                        {t.type === 'income' ? '+ ' : '- '}
                        {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => { setEditingTransaction(t); setIsTransactionDialogOpen(true); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteTransactionClick(t.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error-container transition-colors"
                          title="Excluir"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <CashCategoryDialog 
        open={isCategoryDialogOpen} 
        onOpenChange={setIsCategoryDialogOpen}
        onSave={loadData} 
      />

      <CashTransactionDialog 
        open={isTransactionDialogOpen} 
        onOpenChange={setIsTransactionDialogOpen}
        transactionToEdit={editingTransaction}
        categories={categories}
        onSave={loadData} 
      />

      <Dialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-surface-container-lowest border-2 border-primary-container rounded-3xl shadow-[0_10px_25px_rgba(159,64,45,0.2)]">
          <DialogHeader>
            <DialogTitle className="font-headline-sm text-primary">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-[14px] text-on-surface-variant">Deseja realmente excluir este lançamento?</p>
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-surface-container-low">
            <button 
              onClick={() => setTransactionToDelete(null)}
              className="px-4 py-2 bg-surface-container text-on-surface font-bold text-[13px] rounded-xl hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmDeleteTransaction}
              className="px-4 py-2 bg-error text-white font-bold text-[13px] rounded-xl hover:bg-error/90 transition-all shadow-[0_4px_12px_rgba(255,0,0,0.2)]"
            >
              Sim, excluir
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
