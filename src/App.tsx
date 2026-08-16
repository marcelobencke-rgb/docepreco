import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';

const Login = lazy(() => import('@/pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('@/pages/Register').then((m) => ({ default: m.Register })));
const Settings = lazy(() => import('@/pages/Settings').then((m) => ({ default: m.Settings })));
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.Profile })));
const Inventory = lazy(() => import('@/pages/Inventory').then((m) => ({ default: m.Inventory })));
const Shopping = lazy(() => import('@/pages/Shopping').then((m) => ({ default: m.Shopping })));
const Recipes = lazy(() => import('@/pages/Recipes').then((m) => ({ default: m.Recipes })));
const RecipeForm = lazy(() => import('@/pages/RecipeForm').then((m) => ({ default: m.RecipeForm })));
const RecipeCatalog = lazy(() => import('@/pages/RecipeCatalog').then((m) => ({ default: m.RecipeCatalog })));
const Pricing = lazy(() => import('@/pages/Pricing').then((m) => ({ default: m.Pricing })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Suppliers = lazy(() => import('@/pages/Suppliers').then((m) => ({ default: m.Suppliers })));
const CashFlow = lazy(() => import('@/pages/CashFlow').then((m) => ({ default: m.CashFlow })));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <p className="text-muted-foreground animate-pulse">Carregando...</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="fornecedores" element={<Suppliers />} />
              <Route path="inventario" element={<Inventory />} />
              <Route path="compras" element={<Shopping />} />
              <Route path="fichas-tecnicas" element={<Recipes />} />
              <Route path="receitas" element={<RecipeCatalog />} />
              <Route path="fichas-tecnicas/:id" element={<RecipeForm />} />
              <Route path="receitas/:id" element={<RecipeForm />} />
              <Route path="precificacao" element={<Pricing />} />
              <Route path="caixa" element={<CashFlow />} />
              <Route path="configuracoes" element={<Settings />} />
              <Route path="perfil" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
