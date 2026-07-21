import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Settings } from '@/pages/Settings';
import { Profile } from '@/pages/Profile';
import { Inventory } from '@/pages/Inventory';
import { Shopping } from '@/pages/Shopping';
import { Recipes } from '@/pages/Recipes';
import { RecipeForm } from '@/pages/RecipeForm';
import { RecipeCatalog } from '@/pages/RecipeCatalog';
import { Pricing } from '@/pages/Pricing';
import { Dashboard } from '@/pages/Dashboard';
import { Suppliers } from '@/pages/Suppliers';
import { CashFlow } from '@/pages/CashFlow';

function App() {
  return (
    <AuthProvider>
      <Router>
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
      </Router>
    </AuthProvider>
  );
}

export default App;
