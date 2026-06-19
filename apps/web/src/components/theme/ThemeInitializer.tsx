"use client";

import { useEffect, useRef } from "react";
import { currentUser } from "@/features/auth/services/auth-domain.service";
import { fetchThemeConfig } from "@/lib/settings-api";
import { useTheme } from "@/lib/theme/ThemeProvider";

export function ThemeInitializer() {
  const { applyBrandColors, setTheme } = useTheme();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    void (async () => {
      try {
        const user = await currentUser();
        if (!user?.companyId) return;

        const cfg = await fetchThemeConfig(user.companyId);
        applyBrandColors({
          primaryColor: cfg.primaryColor,
          secondaryColor: cfg.secondaryColor,
          successColor: cfg.successColor,
          warningColor: cfg.warningColor,
          dangerColor: cfg.dangerColor,
        });
        setTheme(cfg.themeMode as "light" | "dark" | "auto");
      } catch {
        // silently fall back to CSS-variable defaults
      }
    })();
  }, [applyBrandColors, setTheme]);

  return null;
}
