import { useUIStore } from "@/lib/stores/ui.store";
import { useCallback } from "react";

export function useUIFacade() {
  const theme = useUIStore((s) => s.theme);
  const sidebarState = useUIStore((s) => s.sidebarState);

  const setTheme = useUIStore((s) => s.setTheme);
  const setSidebarState = useUIStore((s) => s.setSidebarState);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const handleSetTheme = useCallback((newTheme: "light" | "dark" | "auto") => {
    setTheme(newTheme);
  }, [setTheme]);

  const handleSetSidebarState = useCallback((state: "expanded" | "collapsed" | "hidden") => {
    setSidebarState(state);
  }, [setSidebarState]);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  return {
    theme,
    sidebarState,
    setTheme: handleSetTheme,
    setSidebarState: handleSetSidebarState,
    toggleSidebar: handleToggleSidebar,
  };
}
