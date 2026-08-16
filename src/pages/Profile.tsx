import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';

export const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{name: string, phone: string, email: string} | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
        
      if (profileData) {
        setProfile(profileData as any);
      } else {
        // Fallback for users created before the profiles table trigger
        setProfile({
          name: user.user_metadata?.name || user.user_metadata?.first_name || '',
          phone: user.user_metadata?.phone || '',
          email: user.email || ''
        });
      }
      
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSubmitProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: profile.name,
          phone: profile.phone,
          email: profile.email
        });
        
      if (error) {
        throw error;
      }
      
      setToastVariant('success');
      setToastMessage('Perfil salvo com sucesso!');
      setIsSuccessModalOpen(true);
      
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      setToastVariant('error');
      setToastMessage('Erro ao salvar perfil: ' + (error.message || 'Erro desconhecido'));
      setIsSuccessModalOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => prev ? { ...prev, [name]: value } : null);
  };

  if (loading) {
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

      {profile && (
        <Card>
          <form onSubmit={handleSubmitProfile}>
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
                    name="name"
                    type="text"
                    value={profile.name || ''}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Celular (WhatsApp)</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={profile.phone || ''}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profile.email || user?.email || ''}
                    disabled
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-[#8A3322] text-white">
                {saving ? 'Salvando...' : 'Salvar Perfil'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

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
