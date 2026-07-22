import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens } from '../../api/schemas';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthTokens['user'] | null;
  setSession: (t: AuthTokens) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
}

/** Sessão persistida em localStorage — APENAS tokens/usuário, nunca dados clínicos. */
export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (t) => set({ accessToken: t.accessToken, refreshToken: t.refreshToken, user: t.user }),
      updateTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: 'cardio-auth' },
  ),
);
