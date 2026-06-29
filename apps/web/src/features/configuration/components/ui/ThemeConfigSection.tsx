"use client";

import { ColorArea, ColorField, ColorPicker, ColorSlider, ColorSwatch } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { Button } from "@/components/bridge/Button";
import { DEFAULT_PRIMARY_COLOR, type BrandColors } from "@/lib/theme/ThemeProvider";
import type { ThemeMode } from "@/lib/api/theme-api";
import { useThemeConfig, type ThemeDraft } from "@/hooks/ui/useThemeConfig";
import { BrandingSection } from "./BrandingSection";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

interface ColorSlotDef { key: keyof BrandColors; label: string; description: string; }

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

function ColorRow({ slot, value, onChange }: { slot: ColorSlotDef; value: string; onChange: (key: keyof BrandColors, hex: string) => void }) {
  const safeHex = HEX_RE.test(value) ? value : "#000000";
  const handleColorChange = (color: any) => {
    try {
      const raw: string = color.toString("hex");
      const hex = raw.startsWith("#") ? raw.slice(0, 7) : "#" + raw.slice(0, 6);
      onChange(slot.key, hex.toLowerCase());
    } catch { /* ignore malformed */ }
  };
  return (
    <div className="flex items-center gap-4">
      <ColorPicker value={safeHex} onChange={handleColorChange}>
        <ColorPicker.Trigger>
          <ColorSwatch color={safeHex} className="w-10 h-10 rounded-lg border border-default-200 cursor-pointer flex-shrink-0" />
        </ColorPicker.Trigger>
        <ColorPicker.Popover placement="bottom start">
          <div className="flex flex-col gap-3 p-4 w-64 bg-default-50 dark:bg-default-100 border border-default-200 rounded-xl">
            <ColorArea colorSpace="hsb" xChannel="saturation" yChannel="brightness" className="w-full h-36 rounded-lg border border-default-200">
              <ColorArea.Thumb className="w-4 h-4 rounded-full border-2 border-white" />
            </ColorArea>
            <ColorSlider colorSpace="hsb" channel="hue">
              <ColorSlider.Track className="h-3 rounded-full border border-default-200">
                <ColorSlider.Thumb className="w-4 h-4 rounded-full border-2 border-white top-1/2" />
              </ColorSlider.Track>
            </ColorSlider>
            <ColorField aria-label="Valor HEX">
              <ColorField.Group className="flex items-center border border-default-200 rounded-lg overflow-hidden">
                <ColorField.Prefix className="px-2 text-xs text-default-400 bg-default-50 border-r border-default-200 h-8 flex items-center">HEX</ColorField.Prefix>
                <ColorField.Input className="flex-1 px-2 text-sm font-mono uppercase h-8 outline-none" />
              </ColorField.Group>
            </ColorField>
          </div>
        </ColorPicker.Popover>
      </ColorPicker>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{slot.label}</p>
        <p className="text-xs text-default-500">{slot.description}</p>
      </div>
      <span className="text-xs font-mono text-default-500 flex-shrink-0 w-20 text-right">{value.toUpperCase()}</span>
    </div>
  );
}

function ThemePreviewPanel({ colors }: { colors: ThemeDraft }) {
  const primary = HEX_RE.test(colors.primaryColor) ? colors.primaryColor : DEFAULT_PRIMARY_COLOR;
  const success = HEX_RE.test(colors.successColor) ? colors.successColor : "#22c55e";
  const warning = HEX_RE.test(colors.warningColor) ? colors.warningColor : "#f59e0b";
  const danger = HEX_RE.test(colors.dangerColor) ? colors.dangerColor : "#ef4444";
  const secondary = HEX_RE.test(colors.secondaryColor) ? colors.secondaryColor : "#64748b";
  return (
    <div className="rounded-xl border border-default-200 overflow-hidden bg-default-50 dark:bg-default-100" style={{ minHeight: 200 }}>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-default-100">
        <div className="w-5 h-5 rounded-md" style={{ backgroundColor: primary }} />
        <span className="text-sm font-semibold text-foreground">ParkFlow</span>
        <div className="ml-auto flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: danger }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: warning }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: success }} />
        </div>
      </div>
      <div className="flex">
        <div className="w-28 border-r border-default-100 p-2.5 space-y-1">
          {["Inicio", "Ingresos", "Reportes", "Config"].map((item, i) => (
            <div key={item} className="text-xs px-2 py-1.5 rounded-md font-medium"
              style={i === 0 ? { backgroundColor: primary + "22", color: primary } : { color: "#94a3b8" }}>
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {[{ label: "Primario", color: primary }, { label: "Secundario", color: secondary }, { label: "Éxito", color: success }, { label: "Error", color: danger }].map(({ label, color }) => (
              <button key={label} className="text-xs px-3 py-1.5 rounded-lg text-default-50 font-medium border-0" style={{ backgroundColor: color }}>{label}</button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {[{ label: "Activo", color: success }, { label: "Pendiente", color: warning }, { label: "Error", color: danger }, { label: "Info", color: primary }].map(({ label, color }) => (
              <span key={label} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + "22", color }}>{label}</span>
            ))}
          </div>
          <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: warning + "22", color: warning, border: `1px solid ${warning}44` }}>
            ⚠ Tiquete por expirar en 5 minutos
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeConfigSection({ companyId, onNotify }: { companyId: string; onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void }) {
  const { loading, saving, dirty, draft, savedConfig, updateDraft, handleSave, handleReset, handleCancel, handleLogoUpload, handleFaviconUpload, handleRemoveLogo, handleRemoveFavicon } = useThemeConfig(companyId, onNotify);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin dark:border-brand-400" />
        <span className="ml-3 text-sm text-default-500">Cargando configuración de tema…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <Card.Header>
          <h2 className="text-base font-semibold text-foreground">Paleta de colores</h2>
          <p className="text-sm text-default-500 mt-0.5">Haz clic en el color para abrir el selector. Los cambios se aplican en tiempo real.</p>
        </Card.Header>
        <Card.Content className="space-y-5">
          {COLOR_SLOTS.map((slot) => (
            <ColorRow key={slot.key} slot={slot} value={draft[slot.key] as string} onChange={(key, hex) => updateDraft(key, hex)} />
          ))}
        </Card.Content>
      </Card>

      <Card>
        <Card.Header><h2 className="text-base font-semibold text-foreground">Modo de tema</h2></Card.Header>
        <Card.Content>
          <div className="flex gap-2 flex-wrap">
            {THEME_MODES.map((m) => (
              <button key={m.value} type="button" onClick={() => updateDraft("themeMode", m.value)}
                className={["px-4 py-2 rounded-lg border text-sm font-medium transition-colors", draft.themeMode === m.value ? "bg-brand-500 text-default-50 border-brand-500" : "bg-default-50 dark:bg-default-100 text-default-700 border-default-200 hover:border-default-300"].join(" ")}>
                {m.label}
              </button>
            ))}
          </div>
        </Card.Content>
      </Card>

      <BrandingSection savedConfig={savedConfig} onLogoUpload={handleLogoUpload} onFaviconUpload={handleFaviconUpload} onRemoveLogo={handleRemoveLogo} onRemoveFavicon={handleRemoveFavicon} />

      <Card>
        <Card.Header>
          <h2 className="text-base font-semibold text-foreground">Vista previa en vivo</h2>
          <p className="text-sm text-default-500 mt-0.5">Los cambios de color se reflejan instantáneamente.</p>
        </Card.Header>
        <Card.Content><ThemePreviewPanel colors={draft} /></Card.Content>
      </Card>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>Restaurar predeterminados</Button>
        <div className="flex gap-2 items-center">
          {dirty && <span className="text-xs text-amber-600 self-center">Cambios sin guardar</span>}
          {dirty && <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>Cancelar</Button>}
          <Button color="primary" size="sm" onClick={handleSave} disabled={saving || !dirty}>{saving ? "Guardando…" : "Guardar tema"}</Button>
        </div>
      </div>
    </div>
  );
}
