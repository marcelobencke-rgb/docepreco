import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from './queryKeys';

export const profileSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  phone: z.string().min(1, 'Celular obrigatório'),
  email: z.string().email('E-mail inválido'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

async function fetchProfile(user: User): Promise<ProfileFormValues> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (data) {
    return { name: data.name || '', phone: data.phone || '', email: data.email || user.email || '' };
  }

  // Fallback for users created before the profiles table trigger existed.
  return {
    name: user.user_metadata?.name || user.user_metadata?.first_name || '',
    phone: user.user_metadata?.phone || '',
    email: user.email || '',
  };
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.profile(user?.id ?? '');

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchProfile(user!),
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { error } = await supabase.from('profiles').upsert({ id: user!.id, ...values });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateProfile,
  };
}
