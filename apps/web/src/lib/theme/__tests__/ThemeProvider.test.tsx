import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, act, renderHook } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/lib/theme/ThemeProvider";
import { useUIStore } from "@/lib/stores/ui.store";

beforeEach(() => {
  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("data-theme");
  useUIStore.setState({ theme: "auto", isDark: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ThemeProvider - existing tests", () => {
  it("applies dark class when saved as dark", () => {
    useUIStore.setState({ theme: "dark", isDark: false });
    render(
      <ThemeProvider>
        <div>ok</div>
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("respects system preference when auto", () => {
    render(
      <ThemeProvider>
        <div>ok</div>
      </ThemeProvider>
    );
    expect(document.documentElement).toBeDefined();
  });
});

describe("ThemeProvider - expanded tests", () => {
  it("removes dark class and data-theme when switching to light", () => {
    useUIStore.setState({ theme: "light", isDark: false });
    document.documentElement.classList.add("dark");

    render(
      <ThemeProvider>
        <div>ok</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("reacts to media query change in auto mode", () => {
    let listener: ((e: MediaQueryListEvent) => void) | null = null;
    const addEventListener = vi.fn((_event: string, cb: typeof listener) => {
      listener = cb;
    });
    const removeEventListener = vi.fn();

    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    } as unknown as MediaQueryList);

    useUIStore.setState({ theme: "auto" });

    const { unmount } = render(
      <ThemeProvider>
        <div>ok</div>
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    act(() => {
      listener?.({ matches: true } as MediaQueryListEvent);
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    unmount();
    expect(removeEventListener).toHaveBeenCalled();
  });
});

describe("useTheme - applyBrandColors", () => {
  it("applies brand colors as CSS custom properties", () => {
    useUIStore.setState({ theme: "light", isDark: false });

    function TestComponent() {
      const { applyBrandColors } = useTheme();
      React.useEffect(() => {
        applyBrandColors({
          primaryColor: "#D97757",
          secondaryColor: "#6B7280",
          successColor: "#10B981",
          warningColor: "#F59E0B",
          dangerColor: "#EF4444",
        });
      }, [applyBrandColors]);
      return null;
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--accent")).toBe("#D97757");
    expect(root.style.getPropertyValue("--accent-foreground")).toBe("#ffffff");
    expect(root.style.getPropertyValue("--color-primary")).toBe("#D97757");
    expect(root.style.getPropertyValue("--color-secondary")).toBe("#6B7280");
    expect(root.style.getPropertyValue("--color-success")).toBe("#10B981");
    expect(root.style.getPropertyValue("--color-warning")).toBe("#F59E0B");
    expect(root.style.getPropertyValue("--color-danger")).toBe("#EF4444");
    expect(root.style.getPropertyValue("--color-primary-50")).toBeTruthy();
    expect(root.style.getPropertyValue("--color-primary-500")).toBeTruthy();
    expect(root.style.getPropertyValue("--color-brand-500")).toBeTruthy();
    expect(root.style.getPropertyValue("--color-grid-dot")).toBeTruthy();
  });

  it("sets brand color scale (50-900) on the root", () => {
    useUIStore.setState({ theme: "light", isDark: false });

    function TestComponent() {
      const { applyBrandColors } = useTheme();
      React.useEffect(() => {
        applyBrandColors({
          primaryColor: "#3B82F6",
          secondaryColor: "#6B7280",
          successColor: "#10B981",
          warningColor: "#F59E0B",
          dangerColor: "#EF4444",
        });
      }, [applyBrandColors]);
      return null;
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--color-primary-50")).toBeTruthy();
    expect(root.style.getPropertyValue("--color-primary-900")).toBeTruthy();
    expect(root.style.getPropertyValue("--color-brand-500")).toBeTruthy();
  });

  it("skips glow custom properties when dark class is present on root", () => {
    useUIStore.setState({ theme: "dark", isDark: true });
    document.documentElement.classList.add("dark");
    document.documentElement.style.removeProperty("--color-bg-glow-1");

    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => {
      result.current.applyBrandColors({
        primaryColor: "#D97757",
        secondaryColor: "#6B7280",
        successColor: "#10B981",
        warningColor: "#F59E0B",
        dangerColor: "#EF4444",
      });
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--color-bg-glow-1")).toBe("");
    expect(root.style.getPropertyValue("--color-ember")).toBeTruthy();
  });
});

describe("useTheme - clearBrandColors", () => {
  it("removes all brand CSS custom properties", () => {
    function TestComponent() {
      const { applyBrandColors, clearBrandColors } = useTheme();
      React.useEffect(() => {
        applyBrandColors({
          primaryColor: "#D97757",
          secondaryColor: "#6B7280",
          successColor: "#10B981",
          warningColor: "#F59E0B",
          dangerColor: "#EF4444",
        });
        clearBrandColors();
      }, [applyBrandColors, clearBrandColors]);
      return null;
    }

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--accent")).toBe("");
    expect(root.style.getPropertyValue("--color-primary")).toBe("");
  });
});
