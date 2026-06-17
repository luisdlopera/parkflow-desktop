"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
} from "@heroui/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useDialog } from "@/components/ui/DialogProvider";
import { useTheme, DEFAULT_PRIMARY_COLOR, type BrandColors } from "@/lib/theme/ThemeProvider";
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

// ─── defaults matching hero.ts ─────────────────────────────────────────────

const DEFAULTS: BrandColors & { themeMode: ThemeMode } = {
  primaryColor: DEFAULT_PRIMARY_COLOR,
  secondaryColor: "#64748b",
  successColor: "#22c55e",
  warningColor: "#f59e0b",
  dangerColor: "#ef4444",
  themeMode: "auto",
};

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

interface ColorSlotDef {
  key: keyof BrandColors;
  label: string;
  description: string;
}

const COLOR_SLOTS: ColorSlotDef[] = [
  { key: "primaryColor", label: "Color primario", description: "Botones principales, íconos activos, tabs, badges." },
  { key: "secondaryColor", label: "Color secundario", description: "Botones secundarios, estados hover, elementos de soporte." },
  { key: "successColor", label: "Color de éxito", description: "Confirmaciones, transacciones aprobadas, notificaciones positivas." },
  { key: "warningColor", label: "Color de advertencia", description: "Alertas, pagos pendientes, tiquetes por expirar." },
  { key: "dangerColor", label: "Color de error / peligro", description: "Errores, transacciones fallidas, alertas críticas." },
];

const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "auto", label: "Sistema (automático)" },
];

// ─── props ──────────────────────────────────────────────────────────────────

interface ThemeConfigSectionProps {
  companyId: string;
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
}

// ─── single color row ────────────────────────────────────────────────────────

interface ColorRowProps {
  slot: ColorSlotDef;
  value: string;
  onChange: (key: keyof BrandColors, hex: string) => void;
}

function ColorRow({ slot, value, onChange }: ColorRowProps) {
  const safeHex = HEX_RE.test(value) ? value : "#000000";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleColorChange = (color: any) => {
    try {
      const raw: string = color.toString("hex");
      const hex = raw.startsWith("#") ? raw.slice(0, 7) : "#" + raw.slice(0, 6);
      onChange(slot.key, hex.toLowerCase());
    } catch {
      // ignore malformed color
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* HeroUI ColorPicker — swatch triggers popover */}
      <ColorPicker
        value={safeHex}
        onChange={handleColorChange}
      >
        <ColorPicker.Trigger>
          <ColorSwatch
            color={safeHex}
            className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer flex-shrink-0"
          />
        </ColorPicker.Trigger>

        <ColorPicker.Popover placement="bottom start">
          <div className="flex flex-col gap-3 p-4 w-64 bg-white border border-slate-200 rounded-xl">
            {/* Saturation / brightness area */}
            <ColorArea
              colorSpace="hsb"
              xChannel="saturation"
              yChannel="brightness"
              className="w-full h-36 rounded-lg border border-slate-200"
            >
              <ColorArea.Thumb className="w-4 h-4 rounded-full border-2 border-white" />
            </ColorArea>

            {/* Hue slider */}
            <ColorSlider colorSpace="hsb" channel="hue">
              <ColorSlider.Track className="h-3 rounded-full border border-slate-200">
                <ColorSlider.Thumb className="w-4 h-4 rounded-full border-2 border-white top-1/2" />
              </ColorSlider.Track>
            </ColorSlider>

            {/* Hex input */}
            <ColorField aria-label="Valor HEX">
              <ColorField.Group className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <ColorField.Prefix className="px-2 text-xs text-slate-400 bg-slate-50 border-r border-slate-200 h-8 flex items-center">
                  HEX
                </ColorField.Prefix>
                <ColorField.Input className="flex-1 px-2 text-sm font-mono uppercase h-8 outline-none" />
              </ColorField.Group>
            </ColorField>
          </div>
        </ColorPicker.Popover>
      </ColorPicker>

      {/* label */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{slot.label}</p>
        <p className="text-xs text-slate-500">{slot.description}</p>
      </div>

      {/* current hex badge */}
      <span className="text-xs font-mono text-slate-500 flex-shrink-0 w-20 text-right">
        {value.toUpperCase()}
      </span>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function ThemeConfigSection({ companyId, onNotify }: ThemeConfigSectionProps) {
  const { applyBrandColors, setTheme } = useTheme();
  const { confirm } = useDialog();

  const [loading, setLoading] = useState(!!companyId);
  const [saving, setSaving] = useState(false);
  const [savedConfig, setSavedConfig] = useState<ThemeConfig | null>(null);

  const [draft, setDraft] = useState<BrandColors & { themeMode: ThemeMode }>({ ...DEFAULTS });
  const [dirty, setDirty] = useState(false);

  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Load from API on mount
  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchThemeConfig(companyId)
      .then((cfg) => {
        setSavedConfig(cfg);
        const colors: BrandColors & { themeMode: ThemeMode } = {
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
      .catch(() => { /* silently use defaults */ })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const updateDraft = useCallback(
    (key: keyof typeof draft, value: string) => {
      const next = { ...draft, [key]: value };
      setDraft(next);
      setDirty(true);
      applyBrandColors({
        primaryColor: next.primaryColor,
        secondaryColor: next.secondaryColor,
        successColor: next.successColor,
        warningColor: next.warningColor,
        dangerColor: next.dangerColor,
      });
      if (key === "themeMode") {
        setTheme(value as "light" | "dark" | "auto");
      }
    },
    [draft, applyBrandColors, setTheme]
  );

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const cfg = await saveThemeConfig(companyId, {
        primaryColor: draft.primaryColor,
        secondaryColor: draft.secondaryColor,
        successColor: draft.successColor,
        warningColor: draft.warningColor,
        dangerColor: draft.dangerColor,
        themeMode: draft.themeMode,
      });
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
    const ok = await confirm(
      "¿Restaurar los colores predeterminados de ParkFlow? Los cambios no guardados se perderán.",
      { confirmLabel: "Restaurar", title: "Restaurar colores" }
    );
    if (!ok) return;
    setDraft({ ...DEFAULTS });
    setDirty(true);
    applyBrandColors(DEFAULTS);
    setTheme(DEFAULTS.themeMode);
  };

  const handleCancel = async () => {
    if (!dirty) return;
    const ok = await confirm(
      "¿Descartar los cambios no guardados y restaurar los valores guardados?",
      { confirmLabel: "Descartar", title: "Descartar cambios" }
    );
    if (!ok) return;
    if (savedConfig) {
      const restored: BrandColors & { themeMode: ThemeMode } = {
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setLogoUploading(true);
    try {
      const cfg = await uploadThemeLogo(companyId, file);
      setSavedConfig(cfg);
      onNotify({ kind: "ok", text: "Logo actualizado correctamente" });
    } catch {
      onNotify({ kind: "err", text: "Error al subir el logo" });
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setFaviconUploading(true);
    try {
      const cfg = await uploadThemeFavicon(companyId, file);
      setSavedConfig(cfg);
      onNotify({ kind: "ok", text: "Favicon actualizado correctamente" });
    } catch {
      onNotify({ kind: "err", text: "Error al subir el favicon" });
    } finally {
      setFaviconUploading(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-slate-500">Cargando configuración de tema…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Color Palette ─────────────────────────────────────────────────── */}
      <Card>
        <Card.Header>
          <h2 className="text-base font-semibold text-slate-900">Paleta de colores</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Haz clic en el color para abrir el selector. Los cambios se aplican en tiempo real.
          </p>
        </Card.Header>
        <Card.Content className="space-y-5">
          {COLOR_SLOTS.map((slot) => (
            <ColorRow
              key={slot.key}
              slot={slot}
              value={draft[slot.key] as string}
              onChange={(key, hex) => updateDraft(key, hex)}
            />
          ))}
        </Card.Content>
      </Card>

      {/* ── Theme Mode ────────────────────────────────────────────────────── */}
      <Card>
        <Card.Header>
          <h2 className="text-base font-semibold text-slate-900">Modo de tema</h2>
        </Card.Header>
        <Card.Content>
          <div className="flex gap-2 flex-wrap">
            {THEME_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => updateDraft("themeMode", m.value)}
                className={[
                  "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                  draft.themeMode === m.value
                    ? "bg-primary-500 text-white border-primary-500"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300",
                ].join(" ")}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Card.Content>
      </Card>

      {/* ── Branding ──────────────────────────────────────────────────────── */}
      <Card>
        <Card.Header>
          <h2 className="text-base font-semibold text-slate-900">Logotipo y favicon</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Formatos: PNG, JPG, SVG · Máximo 2 MB
          </p>
        </Card.Header>
        <Card.Content className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Logo */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800">Logotipo</p>
            <div className="h-24 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50">
              {savedConfig?.logoUrl ? (
                <img src={savedConfig.logoUrl} alt="Logo actual" className="max-h-20 max-w-full object-contain" />
              ) : (
                <p className="text-xs text-slate-400">Sin logotipo</p>
              )}
            </div>
            <div className="flex gap-2">
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
              <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                {logoUploading ? "Subiendo…" : savedConfig?.logoUrl ? "Reemplazar" : "Subir logo"}
              </Button>
              {savedConfig?.logoUrl && (
                <Button size="sm" variant="outline" color="danger" onClick={handleRemoveLogo}>Eliminar</Button>
              )}
            </div>
          </div>

          {/* Favicon */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800">Favicon</p>
            <div className="h-24 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50">
              {savedConfig?.faviconUrl ? (
                <img src={savedConfig.faviconUrl} alt="Favicon actual" className="max-h-16 max-w-full object-contain" />
              ) : (
                <p className="text-xs text-slate-400">Sin favicon</p>
              )}
            </div>
            <div className="flex gap-2">
              <input ref={faviconInputRef} type="file" accept="image/x-icon,image/png,image/svg+xml" className="hidden" onChange={handleFaviconUpload} />
              <Button size="sm" variant="outline" onClick={() => faviconInputRef.current?.click()} disabled={faviconUploading}>
                {faviconUploading ? "Subiendo…" : savedConfig?.faviconUrl ? "Reemplazar" : "Subir favicon"}
              </Button>
              {savedConfig?.faviconUrl && (
                <Button size="sm" variant="outline" color="danger" onClick={handleRemoveFavicon}>Eliminar</Button>
              )}
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* ── Live Preview ──────────────────────────────────────────────────── */}
      <Card>
        <Card.Header>
          <h2 className="text-base font-semibold text-slate-900">Vista previa en vivo</h2>
          <p className="text-sm text-slate-500 mt-0.5">Los cambios de color se reflejan instantáneamente.</p>
        </Card.Header>
        <Card.Content>
          <ThemePreviewPanel colors={draft} />
        </Card.Content>
      </Card>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
          Restaurar predeterminados
        </Button>
        <div className="flex gap-2 items-center">
          {dirty && <span className="text-xs text-amber-600 self-center">Cambios sin guardar</span>}
          {dirty && (
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
              Cancelar
            </Button>
          )}
          <Button color="primary" size="sm" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? "Guardando…" : "Guardar tema"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Panel ───────────────────────────────────────────────────────────

function ThemePreviewPanel({ colors }: { colors: BrandColors & { themeMode: ThemeMode } }) {
  const primary = HEX_RE.test(colors.primaryColor) ? colors.primaryColor : DEFAULT_PRIMARY_COLOR;
  const success = HEX_RE.test(colors.successColor) ? colors.successColor : "#22c55e";
  const warning = HEX_RE.test(colors.warningColor) ? colors.warningColor : "#f59e0b";
  const danger = HEX_RE.test(colors.dangerColor) ? colors.dangerColor : "#ef4444";
  const secondary = HEX_RE.test(colors.secondaryColor) ? colors.secondaryColor : "#64748b";

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white" style={{ minHeight: 200 }}>
      {/* mock header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100">
        <div className="w-5 h-5 rounded-md" style={{ backgroundColor: primary }} />
        <span className="text-sm font-semibold text-slate-800">ParkFlow</span>
        <div className="ml-auto flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: danger }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: warning }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: success }} />
        </div>
      </div>
      <div className="flex">
        {/* mock sidebar */}
        <div className="w-28 border-r border-slate-100 p-2.5 space-y-1">
          {["Inicio", "Ingresos", "Reportes", "Config"].map((item, i) => (
            <div key={item} className="text-xs px-2 py-1.5 rounded-md font-medium"
              style={i === 0 ? { backgroundColor: primary + "22", color: primary } : { color: "#94a3b8" }}>
              {item}
            </div>
          ))}
        </div>
        {/* mock content */}
        <div className="flex-1 p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Primario", color: primary },
              { label: "Secundario", color: secondary },
              { label: "Éxito", color: success },
              { label: "Error", color: danger },
            ].map(({ label, color }) => (
              <button key={label} className="text-xs px-3 py-1.5 rounded-lg text-white font-medium border-0"
                style={{ backgroundColor: color }}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Activo", color: success },
              { label: "Pendiente", color: warning },
              { label: "Error", color: danger },
              { label: "Info", color: primary },
            ].map(({ label, color }) => (
              <span key={label} className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: color + "22", color }}>
                {label}
              </span>
            ))}
          </div>
          <div className="text-xs px-3 py-2 rounded-lg"
            style={{ backgroundColor: warning + "22", color: warning, border: `1px solid ${warning}44` }}>
            ⚠ Tiquete por expirar en 5 minutos
          </div>
        </div>
      </div>
    </div>
  );
}
