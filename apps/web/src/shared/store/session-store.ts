import { create } from "zustand";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SessionState {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setPermissions: (permissions: string[]) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  permissions: [],
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setPermissions: (permissions) => set({ permissions }),
  logout: () => set({ user: null, permissions: [], isAuthenticated: false }),
  hasPermission: (permission) => get().permissions.includes(permission),
}));
