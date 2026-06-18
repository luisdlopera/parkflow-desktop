"use client";
import { useCallback, useEffect, useState } from "react";
import { useTheme, DEFAULT_PRIMARY_COLOR, type BrandColors } from "@/lib/theme/ThemeProvider";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  fetchThemeConfig,
  saveThemeConfig,
  uploadThemeLogo,
  uploadThemeFavicon,
  removeThemeLogo,
  removeThemeFavicon,
  type ThemeConfig,
  type ThemeMode,
} from "@/lib/settings-api";

const DEFAULTS: BrandColors & { themeMode: ThemeMode } = {
  primaryColor: DEFAULT_PRIMARY_COLOR,
  secondaryColor: "#64748b",
  successColor: "#22c55e",
  warningColor: "#f59e0b",
  dangerColor: "#ef4444",
  themeMode: "auto",
};

export type ThemeDraft = BrandColors & { themeMode: ThemeMode };

export function useThemeConfig(
  companyId: string,
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void
) {
  const { applyBrandColors, setTheme } = useTheme();
  const { confirm } = useDialog();

  const [loading, setLoading] = useState(!!companyId);
  const [saving, setSaving] = useState(false);
  const [savedConfig, setSavedConfig] = useState<ThemeConfig | null>(null);
  const [draft, setDraft] = useState<ThemeDraft>({ ...DEFAULTS });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    fetchThemeConfig(companyId)
      .then((cfg) => {
        setSavedConfig(cfg);
        const colors: ThemeDraft = {
          primaryColor: cfg.primaryColor,
          secondaryColor: cfg.secondaryColor,
          successColor: cfg.successColor,
          warningColor: cfg.warningColor,
          dangerColor: cfg.dangerColor,
          themeMode: cfg.themeMode as ThemeMode,
        };
        setDraft(colors);
        applyBrandColors(colors);
        setTheme(cfg.themeMode as "light" | "dark" | "auto");
      })
      .catch(() => { /* use defaults */ })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const updateDraft = useCallback((key: keyof ThemeDraft, value: string) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      applyBrandColors({ primaryColor: next.primaryColor, secondaryColor: next.secondaryColor, successColor: next.successColor, warningColor: next.warningColor, dangerColor: next.dangerColor });
      if (key === "themeMode") setTheme(value as "light" | "dark" | "auto");
      return next;
    });
    setDirty(true);
  }, [applyBrandColors, setTheme]);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const cfg = await saveThemeConfig(companyId, { primaryColor: draft.primaryColor, secondaryColor: draft.secondaryColor, successColor: draft.successColor, warningColor: draft.warningColor, dangerColor: draft.dangerColor, themeMode: draft.themeMode });
      setSavedConfig(cfg);
      setDirty(false);
      applyBrandColors(draft);
      setTheme(draft.themeMode);
      onNotify({ kind: "ok", text: "Tema guardado correctamente" });
    } catch {
      onNotify({ kind: "err", text: "Error al guardar el tema. Intenta de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirm("¿Restaurar los colores predeterminados de ParkFlow? Los cambios no guardados se perderán.", { confirmLabel: "Restaurar", title: "Restaurar colores" });
    if (!ok) return;
    setDraft({ ...DEFAULTS });
    setDirty(true);
    applyBrandColors(DEFAULTS);
    setTheme(DEFAULTS.themeMode);
  };

  const handleCancel = async () => {
    if (!dirty) return;
    const ok = await confirm("¿Descartar los cambios no guardados y restaurar los valores guardados?", { confirmLabel: "Descartar", title: "Descartar cambios" });
    if (!ok) return;
    if (savedConfig) {
      const restored: ThemeDraft = {
        primaryColor: savedConfig.primaryColor,
        secondaryColor: savedConfig.secondaryColor,
        successColor: savedConfig.successColor,
        warningColor: savedConfig.warningColor,
        dangerColor: savedConfig.dangerColor,
        themeMode: savedConfig.themeMode as ThemeMode,
      };
      setDraft(restored);
      setDirty(false);
      applyBrandColors(restored);
      setTheme(restored.themeMode);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!companyId) return;
    try {
      const cfg = await uploadThemeLogo(companyId, file);
      setSavedConfig(cfg);
      onNotify({ kind: "ok", text: "Logo actualizado correctamente" });
    } catch {
      onNotify({ kind: "err", text: "Error al subir el logo" });
    }
  };

  const handleFaviconUpload = async (file: File) => {
    if (!companyId) return;
    try {
      const cfg = await uploadThemeFavicon(companyId, file);
      setSavedConfig(cfg);
      onNotify({ kind: "ok", text: "Favicon actualizado correctamente" });
    } catch {
      onNotify({ kind: "err", text: "Error al subir el favicon" });
    }
  };

  const handleRemoveLogo = async () => {
    if (!companyId) return;
    try {
      const cfg = await removeThemeLogo(companyId);
      setSavedConfig(cfg);
      onNotify({ kind: "ok", text: "Logo eliminado" });
    } catch {
      onNotify({ kind: "err", text: "Error al eliminar el logo" });
    }
  };

  const handleRemoveFavicon = async () => {
    if (!companyId) return;
    try {
      const cfg = await removeThemeFavicon(companyId);
      setSavedConfig(cfg);
      onNotify({ kind: "ok", text: "Favicon eliminado" });
    } catch {
      onNotify({ kind: "err", text: "Error al eliminar el favicon" });
    }
  };

  return {
    loading, saving, dirty, draft, savedConfig,
    updateDraft, handleSave, handleReset, handleCancel,
    handleLogoUpload, handleFaviconUpload, handleRemoveLogo, handleRemoveFavicon,
  };
}
