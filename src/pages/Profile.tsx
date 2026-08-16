import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { useProfile, profileSchema } from '@/hooks/useProfile';

const profileFormSchema = profileSchema.omit({ email: true });
type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile, isLoading, updateProfile } = useProfile();
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileFormSchema) });

  useEffect(() => {
    if (profile) reset({ name: profile.name, phone: profile.phone });
  }, [profile, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync({ ...values, email: profile?.email || user?.email || '' });

      setToastVariant('success');
      setToastMessage('Perfil salvo com sucesso!');
      setIsSuccessModalOpen(true);

      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      setToastVariant('error');
      setToastMessage('Erro ao salvar perfil: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      setIsSuccessModalOpen(true);
    }
  };

  if (isLoading || !profile) {
    return <div className="p-4">Carregando perfil...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h2 className="font-display-lg text-[22px] text-primary mb-0.5 tracking-tight">Meu Perfil</h2>
          <p className="font-label-md text-[12px] text-[#87655F]">Gerencie suas informações pessoais de acesso.</p>
        </div>
      </header>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
            <CardDescription>
              Suas informações de contato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  aria-invalid={!!errors.name}
                  {...register('name')}
                />
                {errors.name && <p className="text-[12px] text-error">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Celular (WhatsApp)</Label>
                <Input
                  id="phone"
                  type="tel"
                  aria-invalid={!!errors.phone}
                  {...register('phone')}
                />
                {errors.phone && <p className="text-[12px] text-error">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || user?.email || ''}
                  disabled
                  readOnly
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-[#8A3322] text-white">
              {isSubmitting ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Toast
        open={isSuccessModalOpen}
        onOpenChange={setIsSuccessModalOpen}
        title={toastVariant === 'error' ? 'Erro' : 'Sucesso!'}
        description={toastMessage}
        variant={toastVariant}
      />
    </div>
  );
};
