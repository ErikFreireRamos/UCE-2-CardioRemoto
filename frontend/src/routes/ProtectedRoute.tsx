import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../features/auth/useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const authed = useAuth((s) => !!s.accessToken);
  if (!authed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
