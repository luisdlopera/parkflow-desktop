import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface ConfigPageHeaderProps {
  title: string;
  description?: string;
  groupLabel: string;
  groupId?: string;
  sectionLabel: string;
}

export function ConfigPageHeader({ title, description, groupLabel, groupId, sectionLabel }: ConfigPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-2">
      <Link href={groupId ? `/configuracion?group=${groupId}` : "/configuracion"} className="inline-flex items-center gap-2 text-sm font-medium text-default-500 hover:text-foreground w-fit transition-colors" aria-label="Volver">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Volver
      </Link>
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-default-400 mb-2">
          <Link href="/configuracion" className="hover:text-amber-700/80 transition-colors">Configuración</Link>
          {groupLabel && (
            <>
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
              {groupId ? (
                <Link href={`/configuracion?group=${groupId}`} className="hover:text-amber-700/80 transition-colors">{groupLabel}</Link>
              ) : (
                <span>{groupLabel}</span>
              )}
            </>
          )}
          <ChevronRight className="w-3 h-3" aria-hidden="true" />
          <span className="text-amber-700/80">{sectionLabel}</span>
        </div>
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
      </div>
    </div>
  );
}
