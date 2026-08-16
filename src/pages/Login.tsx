import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link to="/" className="mb-6 block">
        <img src="/logo.png" alt="Docepreço Logo" className="w-32 h-auto mx-auto" />
      </Link>

      <div className="w-full max-w-md bg-surface-container-lowest border-2 border-primary-container rounded-3xl shadow-[0_10px_25px_rgba(159,64,45,0.2)] p-8">
        <div className="mb-6 space-y-1">
          <h1 className="font-headline-sm text-primary">Entrar</h1>
          <p className="font-body-md text-on-surface-variant">
            Digite seu e-mail e senha para acessar sua conta
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {error && (
            <div className="rounded-xl bg-error-container p-3 text-sm text-error">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="font-label-md text-on-surface-variant">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
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
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <div className="text-center text-[13px] text-on-surface-variant pt-2">
            Não tem uma conta?{' '}
            <Link to="/register" className="font-bold text-primary hover:underline">
              Cadastre-se
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
