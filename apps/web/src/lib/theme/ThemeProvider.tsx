"use client";

import { useEffect, useCallback, type ReactNode } from "react";

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
  let r, g, b;

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

import { useUIStore } from "@/lib/stores/ui.store";
import { Theme, BrandColors, DEFAULT_PRIMARY_COLOR } from "./theme.types";

export { DEFAULT_PRIMARY_COLOR, type Theme, type BrandColors };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setIsDark } = useUIStore();

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
  }, [setIsDark]);

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

  return <>{children}</>;
}

export function useTheme() {
  const themeState = useUIStore();

  const applyBrandColors = useCallback((colors: BrandColors) => {
    const root = document.documentElement;
    const isDark = root.classList.contains("dark") || root.getAttribute("data-theme") === "dark";

    const primaryScale = generateColorScale(colors.primaryColor);

    // HeroUI v3: set --accent (hex works in color-mix() calculations)
    root.style.setProperty("--accent", colors.primaryColor);
    root.style.setProperty("--accent-foreground", "#ffffff");

    // Legacy HeroUI v2 format kept for any remaining HSL references
    root.style.setProperty("--heroui-primary", hexToHsl(colors.primaryColor));
    root.style.setProperty("--heroui-secondary", hexToHsl(colors.secondaryColor));
    root.style.setProperty("--heroui-success", hexToHsl(colors.successColor));
    root.style.setProperty("--heroui-warning", hexToHsl(colors.warningColor));
    root.style.setProperty("--heroui-danger", hexToHsl(colors.dangerColor));
    root.style.setProperty("--heroui-focus", hexToHsl(colors.primaryColor));

    Object.entries(primaryScale).forEach(([level, hex]) => {
      root.style.setProperty(`--color-primary-${level}`, hex);
      root.style.setProperty(`--color-brand-${level}`, hex);
    });

    root.style.setProperty("--color-primary", colors.primaryColor);
    root.style.setProperty("--color-brand-500", colors.primaryColor);
    root.style.setProperty("--color-secondary", colors.secondaryColor);
    root.style.setProperty("--color-success", colors.successColor);
    root.style.setProperty("--color-warning", colors.warningColor);
    root.style.setProperty("--color-danger", colors.dangerColor);

    const p = colors.primaryColor;
    const r = parseInt(p.slice(1, 3), 16);
    const g = parseInt(p.slice(3, 5), 16);
    const b = parseInt(p.slice(5, 7), 16);

    // In dark mode keep the near-black base; in light mode keep the neutral #FAFAF8 background
    // and only tint the ambient glows with the brand color
    if (!isDark) {
      root.style.setProperty("--color-bg-glow-1", primaryScale["100"]);
      root.style.setProperty("--color-bg-glow-2", primaryScale["200"]);
    }

    root.style.setProperty("--color-ember", primaryScale["600"]);
    root.style.setProperty("--color-moss", primaryScale["700"]);
    root.style.setProperty("--color-grid-dot", `rgba(${r}, ${g}, ${b}, 0.2)`);
    root.style.setProperty("--color-primary-ring", `rgba(${r}, ${g}, ${b}, 0.08)`);
    root.style.setProperty("--color-primary-ring-strong", `rgba(${r}, ${g}, ${b}, 0.15)`);
  }, []);

  const clearBrandColors = useCallback(() => {
    const root = document.documentElement;
    const vars = [
      "--accent", "--accent-foreground",
      "--heroui-primary", "--heroui-secondary", "--heroui-success",
      "--heroui-warning", "--heroui-danger", "--heroui-focus",
      "--color-brand-500", "--color-primary", "--color-secondary",
      "--color-success", "--color-warning", "--color-danger",
      "--color-ash", "--color-ember", "--color-moss",
      "--color-bg-glow-1", "--color-bg-glow-2", "--color-grid-dot",
      "--color-primary-ring", "--color-primary-ring-strong"
    ];
    for (let i = 0; i <= 9; i++) {
      const scale = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
      vars.push(`--color-primary-${scale[i]}`);
      vars.push(`--color-brand-${scale[i]}`);
    }
    vars.forEach(v => root.style.removeProperty(v));
  }, []);

  return {
    theme: themeState.theme,
    userSetTheme: themeState.userSetTheme,
    setTheme: themeState.setTheme,
    isDark: themeState.isDark,
    applyBrandColors,
    clearBrandColors,
  };
}
