import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark" | "system";
type SidebarState = "expanded" | "collapsed" | "hidden";

interface UIState {
  theme: ThemeMode;
  sidebarState: SidebarState;
  setTheme: (theme: ThemeMode) => void;
  setSidebarState: (state: SidebarState) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "system",
      sidebarState: "expanded",
      setTheme: (theme) => set({ theme }),
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
