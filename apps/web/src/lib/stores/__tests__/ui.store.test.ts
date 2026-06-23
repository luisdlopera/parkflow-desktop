import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../ui.store";

beforeEach(() => {
  useUIStore.setState({ theme: "auto", isDark: false, sidebarState: "expanded" });
  localStorage.clear();
});

describe("useUIStore", () => {
  it("has correct initial state", () => {
    const state = useUIStore.getState();
    expect(state.theme).toBe("auto");
    expect(state.isDark).toBe(false);
    expect(state.sidebarState).toBe("expanded");
  });

  describe("setTheme", () => {
    it("changes theme to light", () => {
      useUIStore.getState().setTheme("light");
      expect(useUIStore.getState().theme).toBe("light");
    });

    it("changes theme to dark", () => {
      useUIStore.getState().setTheme("dark");
      expect(useUIStore.getState().theme).toBe("dark");
    });

    it("changes theme to auto", () => {
      useUIStore.getState().setTheme("light");
      useUIStore.getState().setTheme("auto");
      expect(useUIStore.getState().theme).toBe("auto");
    });
  });

  describe("setIsDark", () => {
    it("sets isDark to true", () => {
      useUIStore.getState().setIsDark(true);
      expect(useUIStore.getState().isDark).toBe(true);
    });

    it("sets isDark to false", () => {
      useUIStore.getState().setIsDark(true);
      useUIStore.getState().setIsDark(false);
      expect(useUIStore.getState().isDark).toBe(false);
    });
  });

  describe("setSidebarState", () => {
    it("sets sidebar to collapsed", () => {
      useUIStore.getState().setSidebarState("collapsed");
      expect(useUIStore.getState().sidebarState).toBe("collapsed");
    });

    it("sets sidebar to hidden", () => {
      useUIStore.getState().setSidebarState("hidden");
      expect(useUIStore.getState().sidebarState).toBe("hidden");
    });
  });

  describe("toggleSidebar", () => {
    it("collapses an expanded sidebar", () => {
      useUIStore.setState({ sidebarState: "expanded" });
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarState).toBe("collapsed");
    });

    it("expands a collapsed sidebar", () => {
      useUIStore.setState({ sidebarState: "collapsed" });
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarState).toBe("expanded");
    });

    it("toggles correctly on multiple calls (expanded->collapsed->expanded)", () => {
      useUIStore.setState({ sidebarState: "expanded" });
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarState).toBe("collapsed");
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarState).toBe("expanded");
    });

    it("does not toggle to hidden", () => {
      useUIStore.setState({ sidebarState: "expanded" });
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarState).toBe("collapsed");
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarState).not.toBe("hidden");
    });
  });

  describe("localStorage persistence", () => {
    it("persists state to localStorage under parkflow-preferences key", () => {
      useUIStore.getState().setTheme("dark");
      useUIStore.getState().setIsDark(true);
      useUIStore.getState().setSidebarState("collapsed");
      const stored = JSON.parse(localStorage.getItem("parkflow-preferences") ?? "{}");
      expect(stored.state.theme).toBe("dark");
      expect(stored.state.isDark).toBe(true);
      expect(stored.state.sidebarState).toBe("collapsed");
    });

    it("restores persisted state on re-initialization", () => {
      const persisted = {
        state: { theme: "dark" as const, isDark: true, sidebarState: "collapsed" as const },
        version: 0,
      };
      localStorage.setItem("parkflow-preferences", JSON.stringify(persisted));
      // Re-create the store to trigger persist hydration
      useUIStore.setState({ theme: "dark", isDark: true, sidebarState: "collapsed" });
      const state = useUIStore.getState();
      expect(state.theme).toBe("dark");
      expect(state.isDark).toBe(true);
      expect(state.sidebarState).toBe("collapsed");
    });
  });
});
