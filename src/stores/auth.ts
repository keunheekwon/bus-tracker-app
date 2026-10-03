import { create } from 'zustand';
import { authApi } from '@/api/routes';
import { clearTokens, loadAccessToken, saveTokens, setLogoutHandler } from '@/api/client';
import type { User } from '@/api/types';

type State = { user: User | null; ready: boolean; restore: () => Promise<void>; login: (username: string, password: string) => Promise<User>; logout: () => Promise<void> };
export const useAuth = create<State>((set) => ({
  user: null, ready: false,
  restore: async () => {
    try { if (await loadAccessToken()) set({ user: await authApi.me() }); }
    catch { await clearTokens(); set({ user: null }); }
    finally { set({ ready: true }); }
  },
  login: async (username, password) => { const tokens = await authApi.login(username, password); await saveTokens(tokens); set({ user: tokens.user }); return tokens.user; },
  logout: async () => { try { await authApi.logout(); } catch {} await clearTokens(); set({ user: null }); },
}));
setLogoutHandler(() => useAuth.setState({ user: null }));
