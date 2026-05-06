import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Settings } from './pages/Settings';
import { ComingSoon } from './pages/ComingSoon';

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
        <Route
          path="invoicing"
          element={<ComingSoon titleKey="modules.invoicing.title" descKey="modules.invoicing.desc" />}
        />
        <Route
          path="cheque"
          element={<ComingSoon titleKey="modules.cheque.title" descKey="modules.cheque.desc" />}
        />
        <Route
          path="effet"
          element={<ComingSoon titleKey="modules.effet.title" descKey="modules.effet.desc" />}
        />
        <Route
          path="pos"
          element={<ComingSoon titleKey="modules.pos.title" descKey="modules.pos.desc" />}
        />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
