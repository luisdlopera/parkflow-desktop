import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  requirePasswordChange?: boolean;
  onboardingCompleted?: boolean;
  companyId?: string;
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpiresAt: string | null;
  logoutReason: string | null;
  setUser: (user: User | null) => void;
  setPermissions: (permissions: string[]) => void;
  setLoading: (isLoading: boolean) => void;
  setSessionExpiresAt: (expiresAt: string | null) => void;
  setAuthState: (user: User | null, permissions?: string[], expiresAt?: string | null) => void;
  logout: (reason?: string) => void;
  clearLogoutReason: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true,
  sessionExpiresAt: null,
  logoutReason: null,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false, logoutReason: null }),
  setPermissions: (permissions) => set({ permissions }),
  setLoading: (isLoading) => set({ isLoading }),
  setSessionExpiresAt: (expiresAt) => set({ sessionExpiresAt: expiresAt }),
  setAuthState: (user, permissions, expiresAt) => set({
    user,
    permissions: permissions ?? user?.permissions ?? [],
    isAuthenticated: !!user,
    isLoading: false,
    sessionExpiresAt: expiresAt ?? null,
    logoutReason: null,
  }),
  logout: (reason) => set({
    user: null,
    permissions: [],
    isAuthenticated: false,
    isLoading: false,
    sessionExpiresAt: null,
    logoutReason: reason ?? null,
  }),
  clearLogoutReason: () => set({ logoutReason: null }),
  hasPermission: (permission) => get().permissions.includes(permission),
}));
