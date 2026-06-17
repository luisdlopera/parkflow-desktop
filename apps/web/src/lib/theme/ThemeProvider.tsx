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

/** Convert HSL back to hex for generating color scales */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Generate a color scale (50-900) from a primary color hex value */
function generateColorScale(hex: string): Record<string, string> {
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

  // Generate shades: 50 (very light) to 900 (very dark) using the same hue/sat, varying lightness
  const scale: Record<string, string> = {};
  const levels = [95, 90, 75, 60, 50, 40, 35, 25, 15, 5]; // lightness values for 50-900
  const keys = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"];

  keys.forEach((key, idx) => {
    scale[key] = hslToHex(h, s * 100, levels[idx]);
  });

  return scale;
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

    // Generate primary color scale (50-900)
    const primaryScale = generateColorScale(colors.primaryColor);

    // Set HeroUI semantic colors (HSL format)
    root.style.setProperty("--heroui-primary", hexToHsl(colors.primaryColor));
    root.style.setProperty("--heroui-secondary", hexToHsl(colors.secondaryColor));
    root.style.setProperty("--heroui-success", hexToHsl(colors.successColor));
    root.style.setProperty("--heroui-warning", hexToHsl(colors.warningColor));
    root.style.setProperty("--heroui-danger", hexToHsl(colors.dangerColor));

    // Set primary color scale (all shades)
    Object.entries(primaryScale).forEach(([level, hex]) => {
      root.style.setProperty(`--color-primary-${level}`, hex);
      root.style.setProperty(`--color-brand-${level}`, hex); // Also update brand colors
    });

    // Set primary color aliases
    root.style.setProperty("--color-primary", colors.primaryColor);
    root.style.setProperty("--color-brand-500", colors.primaryColor);
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
    // Also clear all primary color scale vars (50-900)
    for (let i = 0; i <= 9; i++) {
      const scale = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
      vars.push(`--color-primary-${scale[i]}`);
      vars.push(`--color-brand-${scale[i]}`);
    }
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
