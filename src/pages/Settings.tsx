import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';

type SettingsForm = {
  labor_hour_value: number;
  fixed_costs_monthly: number;
  estimated_monthly_production: number;
  default_card_fee_percent: number;
  default_profit_margin_percent: number;
  allow_out_of_stock_production: 'Sim' | 'Não' | 'Confirmar' | 'yes' | 'no' | 'confirm';
};

export const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsForm | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (data) {
        setSettings(data as SettingsForm);
      } else if (error && error.code === 'PGRST116') {
        // No row exists, create one
        const defaultSettings = {
          id: user.id,
          labor_hour_value: 15.00,
          fixed_costs_monthly: 0.00,
          estimated_monthly_production: 1,
          default_card_fee_percent: 3.00,
          default_profit_margin_percent: 40.00,
          allow_out_of_stock_production: 'confirm',
        };
        await supabase.from('user_settings').insert(defaultSettings);
        setSettings(defaultSettings);
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !settings) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('user_settings')
      .update({
        labor_hour_value: settings.labor_hour_value,
        fixed_costs_monthly: settings.fixed_costs_monthly,
        estimated_monthly_production: settings.estimated_monthly_production,
        default_card_fee_percent: settings.default_card_fee_percent,
        default_profit_margin_percent: settings.default_profit_margin_percent,
        allow_out_of_stock_production: settings.allow_out_of_stock_production,
      })
      .eq('id', user.id);
      
    setSaving(false);
    
    if (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações: ' + error.message);
      return;
    }
    
    setSuccessMessage('Configurações salvas com sucesso!');
    setIsSuccessModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => prev ? { ...prev, [name]: parseFloat(value) || 0 } : null);
  };

  if (loading || !settings) {
    return <div className="p-4">Carregando configurações...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Configurações</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">Ajuste seus valores padrão para os cálculos de precificação.</p>
        </div>
      </header>

      <Card>
        <form onSubmit={handleSubmit}>
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
                  name="labor_hour_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.labor_hour_value}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fixed_costs_monthly">Custos fixos mensais (R$)</Label>
                <Input
                  id="fixed_costs_monthly"
                  name="fixed_costs_monthly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.fixed_costs_monthly}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_monthly_production">Produção mensal estimada (unid/receitas)</Label>
                <Input
                  id="estimated_monthly_production"
                  name="estimated_monthly_production"
                  type="number"
                  step="1"
                  min="1"
                  value={settings.estimated_monthly_production}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_card_fee_percent">Taxa padrão de cartão/Pix (%)</Label>
                <Input
                  id="default_card_fee_percent"
                  name="default_card_fee_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={settings.default_card_fee_percent}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_profit_margin_percent">Margem de lucro desejada (%)</Label>
                <Input
                  id="default_profit_margin_percent"
                  name="default_profit_margin_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={settings.default_profit_margin_percent}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2 md:col-span-2 mt-4 pt-4 border-t border-surface-container">
                <Label>Permitir baixa sem estoque?</Label>
                <div className="text-[13px] text-on-surface-variant mb-2">
                  Escolha o que acontece ao tentar finalizar uma receita sem ter os ingredientes necessários em estoque.
                </div>
                <Select
                  value={
                    settings.allow_out_of_stock_production === 'confirm' ? 'Confirmar' : 
                    settings.allow_out_of_stock_production === 'yes' ? 'Sim' : 
                    settings.allow_out_of_stock_production === 'no' ? 'Não' : 
                    (settings.allow_out_of_stock_production || 'Confirmar')
                  }
                  onValueChange={(val: any) => setSettings(prev => prev ? { ...prev, allow_out_of_stock_production: val } : null)}
                >
                  <SelectTrigger className="w-full bg-surface border-2 border-outline-variant font-body-md rounded-2xl !h-12">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sim">Sim - Finaliza a receita ignorando a baixa no estoque automático (não deduz)</SelectItem>
                    <SelectItem value="Não">Não - Bloqueia a finalização da receita</SelectItem>
                    <SelectItem value="Confirmar">Confirmar - Pergunta se deseja finalizar sem dar baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar configurações'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Toast 
        open={isSuccessModalOpen} 
        onOpenChange={setIsSuccessModalOpen} 
        title="Sucesso!" 
        description={successMessage} 
      />
    </div>
  );
};
