import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { GlobalStyles } from './ui/GlobalStyles';
import { AppShell } from './ui/components';
import { ToastProvider } from './features/ui/toast';
import { GlobalStatusBar } from './features/sync/GlobalStatusBar';
import { AutoSync } from './features/sync/AutoSync';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { PatientListPage } from './pages/PatientListPage';
import { PatientCreatePage } from './pages/PatientCreatePage';
import { PatientProfilePage } from './pages/PatientProfilePage';
import { VisitCreatePage } from './pages/VisitCreatePage';
import { EvolutionPage } from './pages/EvolutionPage';

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  if (isLogin) return <>{children}</>;
  return (
    <AppShell>
      <AutoSync />
      <GlobalStatusBar />
      {children}
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <GlobalStyles />
      <ToastProvider>
        <Shell>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><PatientListPage /></ProtectedRoute>} />
            <Route path="/patients/new" element={<ProtectedRoute><PatientCreatePage /></ProtectedRoute>} />
            <Route path="/patients/:id" element={<ProtectedRoute><PatientProfilePage /></ProtectedRoute>} />
            <Route path="/patients/:id/visits/new" element={<ProtectedRoute><VisitCreatePage /></ProtectedRoute>} />
            <Route path="/patients/:id/evolution" element={<ProtectedRoute><EvolutionPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </ToastProvider>
    </BrowserRouter>
  );
}
