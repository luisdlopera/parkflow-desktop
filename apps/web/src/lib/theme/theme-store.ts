import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "auto";

export const DEFAULT_PRIMARY_COLOR = "#f97316";

export interface BrandColors {
  primaryColor: string;
  secondaryColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
}

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  setIsDark: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "auto",
      isDark: false,
      setTheme: (theme) => set({ theme }),
      setIsDark: (isDark) => set({ isDark }),
    }),
    {
      name: "parkflow-theme-store",
      partialize: (state) => ({ theme: state.theme }), // Only persist 'theme'
    }
  )
);
