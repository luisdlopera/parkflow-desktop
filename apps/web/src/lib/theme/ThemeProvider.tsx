"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";

type Theme = "light" | "dark" | "auto";

export interface BrandColors {
  primaryColor: string;
  secondaryColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  applyBrandColors: (colors: BrandColors) => void;
  clearBrandColors: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Converts a #rrggbb hex string to "H S% L%" suitable for HeroUI CSS vars */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("parkflow-theme") as Theme;
      return saved || "auto";
    }
    return "auto";
  });

  const [isDark, setIsDark] = useState(false);

  const applyTheme = useCallback((shouldBeDark: boolean) => {
    setIsDark(shouldBeDark);
    const root = document.documentElement;
    if (shouldBeDark) {
      root.setAttribute("data-theme", "dark");
      root.classList.add("dark");
    } else {
      root.removeAttribute("data-theme");
      root.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    applyTheme(theme === "dark");
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("parkflow-theme", newTheme);
  }, []);

  const applyBrandColors = useCallback((colors: BrandColors) => {
    const root = document.documentElement;
    root.style.setProperty("--heroui-primary", hexToHsl(colors.primaryColor));
    root.style.setProperty("--heroui-secondary", hexToHsl(colors.secondaryColor));
    root.style.setProperty("--heroui-success", hexToHsl(colors.successColor));
    root.style.setProperty("--heroui-warning", hexToHsl(colors.warningColor));
    root.style.setProperty("--heroui-danger", hexToHsl(colors.dangerColor));
    root.style.setProperty("--color-brand-500", colors.primaryColor);
    root.style.setProperty("--color-primary", colors.primaryColor);
    root.style.setProperty("--color-secondary", colors.secondaryColor);
    root.style.setProperty("--color-success", colors.successColor);
    root.style.setProperty("--color-warning", colors.warningColor);
    root.style.setProperty("--color-danger", colors.dangerColor);
  }, []);

  const clearBrandColors = useCallback(() => {
    const root = document.documentElement;
    const vars = [
      "--heroui-primary", "--heroui-secondary", "--heroui-success",
      "--heroui-warning", "--heroui-danger",
      "--color-brand-500", "--color-primary", "--color-secondary",
      "--color-success", "--color-warning", "--color-danger"
    ];
    vars.forEach(v => root.style.removeProperty(v));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, isDark, applyBrandColors, clearBrandColors }),
    [theme, setTheme, isDark, applyBrandColors, clearBrandColors],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
