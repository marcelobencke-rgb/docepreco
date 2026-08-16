import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrencyInput } from '@/lib/utils';
import { useCashCategories } from '@/hooks/useCashCategories';
import {
  useCashTransactions,
  cashTransactionSchema,
  type CashTransaction,
  type CashTransactionFormValues,
  type CashTransactionFormInput,
} from '@/hooks/useCashTransactions';

export type { CashTransaction };

type CashTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: CashTransaction | null;
  startDate: string;
  endDate: string;
};

export const CashTransactionDialog = ({ open, onOpenChange, transactionToEdit, startDate, endDate }: CashTransactionDialogProps) => {
  const { categories } = useCashCategories();
  const { createTransaction, updateTransaction } = useCashTransactions(startDate, endDate);

  const defaultValues: CashTransactionFormInput = transactionToEdit
    ? {
        description: transactionToEdit.description,
        amount: transactionToEdit.amount.toFixed(2).replace('.', ','),
        type: transactionToEdit.type,
        date: transactionToEdit.date,
        category_id: transactionToEdit.category_id || 'none',
      }
    : {
        description: '',
        amount: '',
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        category_id: 'none',
      };

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<CashTransactionFormInput, unknown, CashTransactionFormValues>({
    resolver: zodResolver(cashTransactionSchema),
    values: defaultValues,
  });

  const type = watch('type');
  const categoryId = watch('category_id');
  const filteredCategories = categories.filter(c => c.type === type);

  const onSubmit = async (values: CashTransactionFormValues) => {
    if (transactionToEdit) {
      await updateTransaction.mutateAsync({ id: transactionToEdit.id, values });
    } else {
      await createTransaction.mutateAsync(values);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: '500px', width: '90%' }} className="bg-surface-container-lowest border-2 border-primary-container rounded-3xl shadow-[0_10px_25px_rgba(159,64,45,0.2)]">
        <DialogHeader>
          <DialogTitle className="font-headline-sm text-primary">
            {transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-label-md text-on-surface-variant">Tipo</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val || 'expense');
                      setValue('category_id', 'none');
                    }}
                  >
                    <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 w-full focus:ring-primary-container">
                      <SelectValue>{(v: 'income' | 'expense') => (v === 'income' ? 'Entrada' : 'Saída')}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Entrada</SelectItem>
                      <SelectItem value="expense">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-label-md text-on-surface-variant">Data</Label>
              <Input
                type="date"
                aria-invalid={!!errors.date}
                className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container"
                {...register('date')}
              />
              {errors.date && <p className="text-[12px] text-error">{errors.date.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-label-md text-on-surface-variant">Descrição</Label>
            <Input
              placeholder="Ex: Venda de bolo, Compra de farinha..."
              aria-invalid={!!errors.description}
              className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container"
              {...register('description')}
            />
            {errors.description && <p className="text-[12px] text-error">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-label-md text-on-surface-variant">Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">R$</span>
                <Controller
                  control={control}
                  name="amount"
                  render={({ field }) => (
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(formatCurrencyInput(e.target.value))}
                      placeholder="0,00"
                      aria-invalid={!!errors.amount}
                      className="pl-9 bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 focus-visible:ring-primary-container text-right"
                    />
                  )}
                />
              </div>
              {errors.amount && <p className="text-[12px] text-error">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="font-label-md text-on-surface-variant">Categoria</Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(val) => field.onChange(val || 'none')}>
                    <SelectTrigger className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-10 w-full focus:ring-primary-container">
                      <SelectValue>
                        {categoryId === 'none'
                          ? 'Sem categoria'
                          : categories.find(c => c.id === categoryId)?.name || 'Sem categoria'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {filteredCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-surface-container text-on-surface font-bold text-[13px] py-2.5 rounded-xl hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 text-white font-bold text-[13px] py-2.5 rounded-xl transition-all disabled:opacity-50 ${type === 'income' ? 'bg-primary hover:bg-primary/90' : 'bg-error hover:bg-error/90'}`}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
