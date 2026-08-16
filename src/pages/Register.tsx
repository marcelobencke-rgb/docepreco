import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const registerSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  phone: z.string().min(1, 'Celular obrigatório'),
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido'),
  password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          name: values.name,
          phone: values.phone,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // By default, Supabase requires email confirmation, but we can navigate to login with a message
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link to="/" className="mb-6 block">
        <img src="/logo.png" alt="Docepreço Logo" className="w-32 h-auto mx-auto" />
      </Link>

      <div className="w-full max-w-md bg-surface-container-lowest border-2 border-primary-container rounded-3xl shadow-[0_10px_25px_rgba(159,64,45,0.2)] p-8">
        <div className="mb-6 space-y-1">
          <h1 className="font-headline-sm text-primary">Criar conta</h1>
          <p className="font-body-md text-on-surface-variant">
            Preencha seus dados para começar a precificar seus doces
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {error && (
            <div className="rounded-xl bg-error-container p-3 text-sm text-error">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name" className="font-label-md text-on-surface-variant">Nome completo</Label>
            <Input
              id="name"
              type="text"
              placeholder="Maria da Silva"
              aria-invalid={!!errors.name}
              className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-11 focus-visible:ring-primary-container"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-[12px] text-error">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="font-label-md text-on-surface-variant">Celular (WhatsApp)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              aria-invalid={!!errors.phone}
              className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-11 focus-visible:ring-primary-container"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-[12px] text-error">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="font-label-md text-on-surface-variant">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              aria-invalid={!!errors.email}
              className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-11 focus-visible:ring-primary-container"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-[12px] text-error">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-label-md text-on-surface-variant">Senha</Label>
            <Input
              id="password"
              type="password"
              aria-invalid={!!errors.password}
              className="bg-surface border-2 border-outline-variant font-body-md rounded-xl h-11 focus-visible:ring-primary-container"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-[12px] text-error">{errors.password.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3 rounded-[1.25rem] hover:bg-primary/90 active:scale-95 transition-all shadow-[0_4px_12px_rgba(159,64,45,0.2)] disabled:opacity-60 mt-2"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
          <div className="text-center text-[13px] text-on-surface-variant pt-2">
            Já tem uma conta?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Entrar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
