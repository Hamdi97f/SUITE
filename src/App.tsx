import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Invoicing } from './pages/Invoicing';
import { Cheque } from './pages/Cheque';
import { Effet } from './pages/Effet';
import { POS } from './pages/POS';
import { Files } from './pages/Files';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="invoicing" element={<Invoicing />} />
        <Route path="cheque" element={<Cheque />} />
        <Route path="effet" element={<Effet />} />
        <Route path="pos" element={<POS />} />
        <Route path="files" element={<Files />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
