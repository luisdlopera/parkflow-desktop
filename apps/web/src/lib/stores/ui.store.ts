import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark" | "auto";
type SidebarState = "expanded" | "collapsed" | "hidden";

interface UIState {
  theme: ThemeMode;
  userSetTheme: boolean;
  isDark: boolean;
  sidebarState: SidebarState;
  setTheme: (theme: ThemeMode, userSet?: boolean) => void;
  setIsDark: (isDark: boolean) => void;
  setSidebarState: (state: SidebarState) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "auto",
      userSetTheme: false,
      isDark: false,
      sidebarState: "expanded",
      setTheme: (theme, userSet = false) => set((state) => ({ theme, userSetTheme: userSet || state.userSetTheme })),
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
