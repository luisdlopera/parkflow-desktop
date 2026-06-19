"use client";
import { useRef } from "react";
import { Button } from "@/components/bridge/Button";
import { Card } from "@/components/bridge/Card";
import type { ThemeConfig } from "@/lib/settings-api";

interface Props {
  savedConfig: ThemeConfig | null;
  onLogoUpload: (file: File) => Promise<void>;
  onFaviconUpload: (file: File) => Promise<void>;
  onRemoveLogo: () => Promise<void>;
  onRemoveFavicon: () => Promise<void>;
}

export function BrandingSection({ savedConfig, onLogoUpload, onFaviconUpload, onRemoveLogo, onRemoveFavicon }: Props) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onLogoUpload(file);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleFaviconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onFaviconUpload(file);
    if (faviconInputRef.current) faviconInputRef.current.value = "";
  };

  return (
    <Card>
      <Card.Header>
        <h2 className="text-base font-semibold text-slate-900">Logotipo y favicon</h2>
        <p className="text-sm text-slate-500 mt-0.5">Formatos: PNG, JPG, SVG · Máximo 2 MB</p>
      </Card.Header>
      <Card.Content className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-800">Logotipo</p>
          <div className="h-24 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50">
            {savedConfig?.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={savedConfig.logoUrl} alt="Logo actual" className="max-h-20 max-w-full object-contain" />
              : <p className="text-xs text-slate-400">Sin logotipo</p>}
          </div>
          <div className="flex gap-2">
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoChange} />
            <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
              {savedConfig?.logoUrl ? "Reemplazar" : "Subir logo"}
            </Button>
            {savedConfig?.logoUrl && <Button size="sm" variant="outline" color="danger" onClick={onRemoveLogo}>Eliminar</Button>}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-800">Favicon</p>
          <div className="h-24 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50">
            {savedConfig?.faviconUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={savedConfig.faviconUrl} alt="Favicon actual" className="max-h-16 max-w-full object-contain" />
              : <p className="text-xs text-slate-400">Sin favicon</p>}
          </div>
          <div className="flex gap-2">
            <input ref={faviconInputRef} type="file" accept="image/x-icon,image/png,image/svg+xml" className="hidden" onChange={handleFaviconChange} />
            <Button size="sm" variant="outline" onClick={() => faviconInputRef.current?.click()}>
              {savedConfig?.faviconUrl ? "Reemplazar" : "Subir favicon"}
            </Button>
            {savedConfig?.faviconUrl && <Button size="sm" variant="outline" color="danger" onClick={onRemoveFavicon}>Eliminar</Button>}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
