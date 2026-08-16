import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';

export const settingsSchema = z.object({
  labor_hour_value: z.coerce.number().min(0, 'Deve ser maior ou igual a 0'),
  fixed_costs_monthly: z.coerce.number().min(0, 'Deve ser maior ou igual a 0'),
  estimated_monthly_production: z.coerce.number().min(1, 'Deve ser pelo menos 1'),
  default_card_fee_percent: z.coerce.number().min(0).max(100, 'Deve ser entre 0 e 100'),
  default_profit_margin_percent: z.coerce.number().min(0).max(100, 'Deve ser entre 0 e 100'),
  allow_out_of_stock_production: z.enum(['yes', 'no', 'confirm']),
});

export type SettingsFormValues = z.output<typeof settingsSchema>;
export type SettingsFormInput = z.input<typeof settingsSchema>;

const DEFAULT_SETTINGS: SettingsFormValues = {
  labor_hour_value: 15.0,
  fixed_costs_monthly: 0.0,
  estimated_monthly_production: 1,
  default_card_fee_percent: 3.0,
  default_profit_margin_percent: 40.0,
  allow_out_of_stock_production: 'confirm',
};

/** Normalizes legacy Portuguese-label values that were mistakenly saved to this column. */
function normalizeAllowOutOfStock(value: string | null): SettingsFormValues['allow_out_of_stock_production'] {
  if (value === 'yes' || value === 'Sim') return 'yes';
  if (value === 'no' || value === 'Não') return 'no';
  return 'confirm';
}

async function fetchSettings(userId: string): Promise<SettingsFormValues> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('id', userId)
    .single();

  if (data) {
    return {
      labor_hour_value: data.labor_hour_value,
      fixed_costs_monthly: data.fixed_costs_monthly,
      estimated_monthly_production: data.estimated_monthly_production,
      default_card_fee_percent: data.default_card_fee_percent,
      default_profit_margin_percent: data.default_profit_margin_percent,
      allow_out_of_stock_production: normalizeAllowOutOfStock(data.allow_out_of_stock_production),
    };
  }

  if (error && error.code === 'PGRST116') {
    await supabase.from('user_settings').insert({ id: userId, ...DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
  }

  throw error;
}

export function useSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.settings(user?.id ?? '');

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchSettings(user!.id),
    enabled: !!user,
  });

  const updateSettings = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      const { error } = await supabase
        .from('user_settings')
        .update(values)
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings,
  };
}
