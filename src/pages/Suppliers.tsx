import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers, supplierSchema, type Supplier, type SupplierFormValues } from '@/hooks/useSuppliers';

export const Suppliers = () => {
  const { suppliers, isLoading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('az');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({ resolver: zodResolver(supplierSchema) });

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      reset({
        name: supplier.name,
        contact_info: supplier.contact_info || '',
        email: supplier.email || '',
        cnpj: supplier.cnpj || '',
      });
    } else {
      setEditingSupplier(null);
      reset({ name: '', contact_info: '', email: '', cnpj: '' });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: SupplierFormValues) => {
    if (editingSupplier) {
      await updateSupplier.mutateAsync({ id: editingSupplier.id, values });
    } else {
      await createSupplier.mutateAsync(values);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor? Ele será removido de todos os ingredientes que o utilizam.')) return;
    deleteSupplier.mutate(id);
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter(sup => sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     (sup.contact_info && sup.contact_info.toLowerCase().includes(searchTerm.toLowerCase())))
      .sort((a, b) => {
        if (sortOrder === 'az') return a.name.localeCompare(b.name);
        if (sortOrder === 'za') return b.name.localeCompare(a.name);
        return 0;
      });
  }, [suppliers, searchTerm, sortOrder]);

  if (isLoading) return <div className="p-xl text-center text-on-surface-variant font-body-md">Carregando fornecedores...</div>;

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
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-label-md text-on-surface-variant">Nome do fornecedor</Label>
                  <Input id="name" aria-invalid={!!errors.name} className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" {...register('name')} />
                  {errors.name && <p className="text-[12px] text-error">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact" className="font-label-md text-on-surface-variant">Contato (Opcional)</Label>
                  <Input id="contact" placeholder="Telefone, Instagram, etc." className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" {...register('contact_info')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-label-md text-on-surface-variant">E-mail (Opcional)</Label>
                  <Input id="email" type="email" placeholder="fornecedor@email.com" aria-invalid={!!errors.email} className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" {...register('email')} />
                  {errors.email && <p className="text-[12px] text-error">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="font-label-md text-on-surface-variant">CNPJ (Opcional)</Label>
                  <Input id="cnpj" placeholder="00.000.000/0000-00" className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container" {...register('cnpj')} />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold text-[13px] py-3 rounded-[1.25rem] hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)] mt-4 disabled:opacity-60">
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
        {filteredSuppliers.length === 0 ? (
          <div className="py-xl flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-lowest rounded-3xl border-2 border-dashed border-surface-container">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">storefront</span>
            <p className="font-body-md text-center max-w-md">{searchTerm ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado. Cadastre suas lojas e marcas preferidas.'}</p>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
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
          ))
        )}
      </div>
    </div>
  );
};
