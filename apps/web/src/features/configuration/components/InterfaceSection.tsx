"use client";
import dynamic from "next/dynamic";
import { Card } from "@/components/bridge/Card";
import { Switch } from "@/components/bridge/Switch";

const ThemeConfigSection = dynamic(
  () => import("@/features/configuration/components/ui/ThemeConfigSection").then((m) => ({ default: m.ThemeConfigSection })),
  { ssr: false, loading: () => <p className="text-sm text-slate-600">Cargando personalización...</p> }
);

export default function InterfaceSection({
  settings,
  onUpdate,
  companyId,
  onNotify
}: {
  settings: { showSystemStatus: boolean; showKeyboardShortcuts: boolean };
  onUpdate: (key: "showSystemStatus" | "showKeyboardShortcuts", value: boolean) => void;
  companyId: string;
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <Card.Header>
          <h2 className="text-lg font-semibold text-slate-900">Personalización del Sidebar</h2>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Mostrar estado del sistema</p>
              <p className="text-sm text-slate-500">
                Muestra el indicador "Sistema operativo" en el sidebar con el punto verde de estado.
              </p>
            </div>
            <Switch
              isSelected={settings.showSystemStatus}
              onChange={(checked) => onUpdate("showSystemStatus", checked)}
              size="lg"
              color="primary" aria-label="Alternar opción"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Mostrar atajos de teclado</p>
              <p className="text-sm text-slate-500">
                Muestra la sección de atajos de teclado (F1, F2, F3, F4, Esc) en la parte inferior del sidebar.
              </p>
            </div>
            <Switch
              isSelected={settings.showKeyboardShortcuts}
              onChange={(checked) => onUpdate("showKeyboardShortcuts", checked)}
              size="lg"
              color="primary" aria-label="Alternar opción"
            />
          </div>
        </Card.Content>
      </Card>

      <Card className="bg-amber-50/50 border-amber-200">
        <Card.Content>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-amber-800">Preferencias locales</p>
              <p className="text-sm text-amber-700">
                Las preferencias del sidebar se guardan solo en tu navegador y no afectan a otros usuarios.
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>

      <ThemeConfigSection companyId={companyId} onNotify={onNotify} />
    </div>
  );
}
