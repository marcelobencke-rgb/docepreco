import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Supplier = {
  id: string;
  name: string;
  contact_info: string | null;
  email: string | null;
  cnpj: string | null;
};

export const Suppliers = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [email, setEmail] = useState('');
  const [cnpj, setCnpj] = useState('');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('az');

  const fetchSuppliers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setSuppliers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, [user]);

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setName(supplier.name);
      setContactInfo(supplier.contact_info || '');
      setEmail(supplier.email || '');
      setCnpj(supplier.cnpj || '');
    } else {
      setEditingSupplier(null);
      setName('');
      setContactInfo('');
      setEmail('');
      setCnpj('');
    }
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const supplierData = {
      user_id: user.id,
      name,
      contact_info: contactInfo || null,
      email: email || null,
      cnpj: cnpj || null,
    };

    if (editingSupplier) {
      await supabase
        .from('suppliers')
        .update(supplierData)
        .eq('id', editingSupplier.id);
    } else {
      await supabase
        .from('suppliers')
        .insert(supplierData);
    }

    setIsDialogOpen(false);
    fetchSuppliers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor? Ele será removido de todos os ingredientes que o utilizam.')) return;
    await supabase.from('suppliers').delete().eq('id', id);
    fetchSuppliers();
  };

  if (loading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando fornecedores...</div>;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Meus Fornecedores</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">Gerencie contatos de compras.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger 
              onClick={() => handleOpenDialog()}
              className="flex items-center justify-center gap-2 bg-primary text-white font-bold text-[13px] px-4 py-2.5 rounded-[1.25rem] hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Novo Fornecedor
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-surface-container-lowest border-2 border-primary-container rounded-3xl shadow-[0_10px_25px_rgba(159,64,45,0.2)]">
              <DialogHeader>
                <DialogTitle className="font-headline-sm text-primary">{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-label-md text-on-surface-variant">Nome do fornecedor</Label>
                  <Input id="name" className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact" className="font-label-md text-on-surface-variant">Contato (Opcional)</Label>
                  <Input id="contact" placeholder="Telefone, Instagram, etc." className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-label-md text-on-surface-variant">E-mail (Opcional)</Label>
                  <Input id="email" type="email" placeholder="fornecedor@email.com" className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="font-label-md text-on-surface-variant">CNPJ (Opcional)</Label>
                  <Input id="cnpj" placeholder="00.000.000/0000-00" className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                </div>
                <button type="submit" className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-[13px] py-3 rounded-[1.25rem] hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)] mt-4">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Salvar Fornecedor
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] z-10">search</span>
          <Input 
            type="text" 
            placeholder="Buscar fornecedores..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 bg-surface border-2 border-outline-variant font-body-md rounded-2xl h-12"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="w-full md:w-48">
            <Select value={sortOrder} onValueChange={(val) => setSortOrder(val || 'az')}>
              <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12 w-full">
                <SelectValue placeholder="A-Z" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="az">A-Z</SelectItem>
                <SelectItem value="za">Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* List Container */}
      <div className="flex flex-col gap-4">
        {(() => {
          const filteredSuppliers = suppliers
            .filter(sup => sup.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (sup.contact_info && sup.contact_info.toLowerCase().includes(searchTerm.toLowerCase())))
            .sort((a, b) => {
              if (sortOrder === 'az') return a.name.localeCompare(b.name);
              if (sortOrder === 'za') return b.name.localeCompare(a.name);
              return 0;
            });

          if (filteredSuppliers.length === 0) {
            return (
              <div className="py-xl flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-lowest rounded-3xl border-2 border-dashed border-surface-container">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">storefront</span>
                <p className="font-body-md text-center max-w-md">{searchTerm ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado. Cadastre suas lojas e marcas preferidas.'}</p>
              </div>
            );
          }

          return filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="bg-surface-container-lowest rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sticker hover:scale-[1.01] transition-all relative overflow-hidden group border-2 border-surface-container gap-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              
              {/* Left side: Icon + Name */}
              <div className="flex items-center gap-4 flex-1 w-full relative z-10">
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-on-tertiary-fixed text-[16px]">storefront</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[16px] text-[#3e1d15] font-medium mb-0.5 truncate" title={supplier.name}>{supplier.name}</h3>
                  <p className="text-[13px] text-[#87655F] truncate">
                    {supplier.contact_info ? `Contato: ${supplier.contact_info}` : 'Sem contato'}
                  </p>
                </div>
              </div>

              {/* Right side: Actions */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end md:pl-4 md:border-l-2 border-surface-container-low relative z-10 pt-4 md:pt-0 border-t-2 md:border-t-0 border-dashed border-surface-container-high md:border-solid">
                <button onClick={() => handleOpenDialog(supplier)} className="w-10 h-10 rounded-full bg-surface md:bg-transparent hover:bg-primary-container hover:text-on-primary-container transition-colors flex items-center justify-center shadow-sm md:shadow-none">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button onClick={() => handleDelete(supplier.id)} className="w-10 h-10 rounded-full bg-surface md:bg-transparent hover:bg-error-container text-error transition-colors flex items-center justify-center shadow-sm md:shadow-none">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
};

