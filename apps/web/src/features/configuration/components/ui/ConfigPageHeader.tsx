import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface ConfigPageHeaderProps {
  title: string;
  description?: string;
  groupLabel: string;
  sectionLabel: string;
}

export function ConfigPageHeader({ title, description, groupLabel, sectionLabel }: ConfigPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-2">
      <Link href="/configuracion" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 w-fit transition-colors" aria-label="Volver a configuración">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Volver a configuración
      </Link>
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          <span>Configuración</span>
          {groupLabel && (
            <>
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
              <span>{groupLabel}</span>
            </>
          )}
          <ChevronRight className="w-3 h-3" aria-hidden="true" />
          <span className="text-amber-700/80">{sectionLabel}</span>
        </div>
        <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>}
      </div>
    </div>
  );
}
