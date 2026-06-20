import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setPermissions: (permissions: string[]) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: true, // Empieza en true para esperar la verificación inicial
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setPermissions: (permissions) => set({ permissions }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, permissions: [], isAuthenticated: false, isLoading: false }),
  hasPermission: (permission) => get().permissions.includes(permission),
}));
