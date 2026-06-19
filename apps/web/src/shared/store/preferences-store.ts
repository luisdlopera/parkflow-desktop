import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "light" | "dark" | "system";
type SidebarState = "expanded" | "collapsed" | "hidden";

interface PreferencesState {
  theme: ThemeMode;
  sidebarState: SidebarState;
  setTheme: (theme: ThemeMode) => void;
  setSidebarState: (state: SidebarState) => void;
  toggleSidebar: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
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
