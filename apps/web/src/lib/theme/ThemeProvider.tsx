"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark" | "auto";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("parkflow-theme") as Theme;
      return saved || "auto";
    }
    return "auto";
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    
    const updateTheme = () => {
      let shouldBeDark: boolean;
      
      if (theme === "auto") {
        // Auto-detect based on time (6pm - 6am = dark)
        const hour = new Date().getHours();
        shouldBeDark = hour >= 18 || hour < 6;
      } else {
        shouldBeDark = theme === "dark";
      }

      setIsDark(shouldBeDark);
      
      if (shouldBeDark) {
        root.setAttribute("data-theme", "dark");
        root.classList.add("dark");
      } else {
        root.removeAttribute("data-theme");
        root.classList.remove("dark");
      }
    };

    updateTheme();

    // Check every minute for auto mode
    const interval = setInterval(updateTheme, 60000);
    return () => clearInterval(interval);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("parkflow-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
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
