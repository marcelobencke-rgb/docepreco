import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';
import { useSettings, settingsSchema, type SettingsFormValues, type SettingsFormInput } from '@/hooks/useSettings';

export const Settings = () => {
  const { settings, isLoading, updateSettings } = useSettings();
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormInput, unknown, SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    // The Select field must never start `undefined`, or base-ui's Select locks itself
    // into "uncontrolled" mode on first render and ignores the real value set by reset() later.
    defaultValues: { allow_out_of_stock_production: 'confirm' },
  });

  useEffect(() => {
    if (settings) reset(settings);
  }, [settings, reset]);

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      await updateSettings.mutateAsync(values);
      setErrorMessage(null);
      setIsSuccessModalOpen(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao salvar configurações');
    }
  };

  if (isLoading || !settings) {
    return <div className="p-4">Carregando configurações...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Configurações</h2>
          <p className="font-label-md text-[12px] text-on-surface-variant">Ajuste seus valores padrão para os cálculos de precificação.</p>
        </div>
      </header>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardHeader>
            <CardTitle>Custos e Margens</CardTitle>
            <CardDescription>
              Esses valores serão usados como padrão ao criar novas receitas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="labor_hour_value">Valor da sua hora de trabalho (R$)</Label>
                <Input
                  id="labor_hour_value"
                  type="number"
                  step="0.01"
                  min="0"
                  aria-invalid={!!errors.labor_hour_value}
                  {...register('labor_hour_value')}
                />
                {errors.labor_hour_value && <p className="text-[12px] text-error">{errors.labor_hour_value.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fixed_costs_monthly">Custos fixos mensais (R$)</Label>
                <Input
                  id="fixed_costs_monthly"
                  type="number"
                  step="0.01"
                  min="0"
                  aria-invalid={!!errors.fixed_costs_monthly}
                  {...register('fixed_costs_monthly')}
                />
                {errors.fixed_costs_monthly && <p className="text-[12px] text-error">{errors.fixed_costs_monthly.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_monthly_production">Produção mensal estimada (unid/receitas)</Label>
                <Input
                  id="estimated_monthly_production"
                  type="number"
                  step="1"
                  min="1"
                  aria-invalid={!!errors.estimated_monthly_production}
                  {...register('estimated_monthly_production')}
                />
                {errors.estimated_monthly_production && <p className="text-[12px] text-error">{errors.estimated_monthly_production.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_card_fee_percent">Taxa padrão de cartão/Pix (%)</Label>
                <Input
                  id="default_card_fee_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  aria-invalid={!!errors.default_card_fee_percent}
                  {...register('default_card_fee_percent')}
                />
                {errors.default_card_fee_percent && <p className="text-[12px] text-error">{errors.default_card_fee_percent.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_profit_margin_percent">Margem de lucro desejada (%)</Label>
                <Input
                  id="default_profit_margin_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  aria-invalid={!!errors.default_profit_margin_percent}
                  {...register('default_profit_margin_percent')}
                />
                {errors.default_profit_margin_percent && <p className="text-[12px] text-error">{errors.default_profit_margin_percent.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-2 mt-4 pt-4 border-t border-surface-container">
                <Label>Permitir baixa sem estoque?</Label>
                <div className="text-[13px] text-on-surface-variant mb-2">
                  Escolha o que acontece ao tentar finalizar uma receita sem ter os ingredientes necessários em estoque.
                </div>
                <Controller
                  control={control}
                  name="allow_out_of_stock_production"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={(val) => field.onChange(val || 'confirm')}>
                      <SelectTrigger className="w-full bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12">
                        <SelectValue placeholder="Selecione...">
                          {(value: SettingsFormValues['allow_out_of_stock_production']) =>
                            value === 'yes' ? 'Sim' : value === 'no' ? 'Não' : 'Confirmar'
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Sim - Finaliza a receita ignorando a baixa no estoque automático (não deduz)</SelectItem>
                        <SelectItem value="no">Não - Bloqueia a finalização da receita</SelectItem>
                        <SelectItem value="confirm">Confirmar - Pergunta se deseja finalizar sem dar baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-2">
            {errorMessage && <p className="text-[13px] text-error">{errorMessage}</p>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar configurações'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Toast
        open={isSuccessModalOpen}
        onOpenChange={setIsSuccessModalOpen}
        title="Sucesso!"
        description="Configurações salvas com sucesso!"
      />
    </div>
  );
};
