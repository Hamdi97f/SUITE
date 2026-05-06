import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth as authApi, type LoginResponse } from '../api/client';

interface AuthState {
  token: string | null;
  user: { id: string; email: string; isAdmin: boolean } | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      loading: false,
      error: null,
      async login(email, password) {
        set({ loading: true, error: null });
        try {
          const res: LoginResponse = await authApi.login(email, password);
          set({
            token: res.token,
            user: { id: res.user_id, email: res.email, isAdmin: !!res.is_admin },
            loading: false,
          });
        } catch (e) {
          set({ loading: false, error: (e as Error).message });
          throw e;
        }
      },
      async register(email, password) {
        set({ loading: true, error: null });
        try {
          await authApi.register(email, password);
          // Auto-login after successful registration.
          const res = await authApi.login(email, password);
          set({
            token: res.token,
            user: { id: res.user_id, email: res.email, isAdmin: !!res.is_admin },
            loading: false,
          });
        } catch (e) {
          set({ loading: false, error: (e as Error).message });
          throw e;
        }
      },
      logout() {
        set({ token: null, user: null, error: null });
      },
    }),
    {
      name: 'suite.auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
    },
  ),
);
