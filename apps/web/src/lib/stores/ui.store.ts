import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark" | "system";
type SidebarState = "expanded" | "collapsed" | "hidden";

interface UIState {
  theme: ThemeMode;
  isDark: boolean;
  sidebarState: SidebarState;
  setTheme: (theme: ThemeMode) => void;
  setIsDark: (isDark: boolean) => void;
  setSidebarState: (state: SidebarState) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "system",
      isDark: false,
      sidebarState: "expanded",
      setTheme: (theme) => set({ theme }),
      setIsDark: (isDark) => set({ isDark }),
      setSidebarState: (state) => set({ sidebarState: state }),
      toggleSidebar: () => {
        const current = get().sidebarState;
        set({ sidebarState: current === "expanded" ? "collapsed" : "expanded" });
      },
    }),
    {
      name: "parkflow-preferences",
    }
  )
);
