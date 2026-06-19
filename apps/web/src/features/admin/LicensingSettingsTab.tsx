"use client";
import { Separator } from "@heroui/react";
import { AccordionItem, Accordion } from "@/components/bridge/Accordion";
import { Card } from "@/components/bridge/Card";
import { Slider } from "@/components/bridge/Slider";
import { Lock } from "lucide-react";
import type { SystemSettings, UpdateSetting } from "./types";

export function LicensingSettingsTab({ settings, onUpdate }: { settings: SystemSettings; onUpdate: UpdateSetting }) {
  return (
    <div className="space-y-4">
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Configuración de Licencias</h3>
          </div>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Días de Prueba por Defecto</p>
              <p className="text-xs text-default-500 mb-2">{settings.defaultTrialDays} días</p>
              <Slider size="sm" step={1} minValue={7} maxValue={30} value={settings.defaultTrialDays} onChange={(v) => onUpdate("defaultTrialDays", v as number)} />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Dispositivos Máximos por Defecto</p>
              <p className="text-xs text-default-500 mb-2">{settings.defaultMaxDevices} dispositivos</p>
              <Slider size="sm" step={1} minValue={1} maxValue={20} value={settings.defaultMaxDevices} onChange={(v) => onUpdate("defaultMaxDevices", v as number)} />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Intervalo Heartbeat</p>
              <p className="text-xs text-default-500 mb-2">{settings.heartbeatIntervalMinutes} minutos</p>
              <Slider size="sm" step={5} minValue={5} maxValue={60} value={settings.heartbeatIntervalMinutes} onChange={(v) => onUpdate("heartbeatIntervalMinutes", v as number)} />
              <p className="text-xs text-default-400 mt-1">Frecuencia de reporte de dispositivos</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Período de Gracia</p>
              <p className="text-xs text-default-500 mb-2">{settings.gracePeriodDays} días</p>
              <Slider size="sm" step={1} minValue={0} maxValue={30} value={settings.gracePeriodDays} onChange={(v) => onUpdate("gracePeriodDays", v as number)} />
              <p className="text-xs text-default-400 mt-1">Días adicionales tras vencimiento</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Lease Offline</p>
              <p className="text-xs text-default-500 mb-2">{settings.offlineLeaseHours} horas</p>
              <Slider size="sm" step={4} minValue={12} maxValue={168} value={settings.offlineLeaseHours} onChange={(v) => onUpdate("offlineLeaseHours", v as number)} />
              <p className="text-xs text-default-400 mt-1">Horas de operación offline permitidas</p>
            </div>
          </div>
        </Card.Content>
      </Card>
      <Card>
        <Card.Header><h3 className="text-lg font-semibold">Límites por Plan</h3></Card.Header>
        <Card.Content>
          <Accordion>
            <AccordionItem key="local" title="Plan Local">
              <div className="space-y-2 text-sm"><p>Operación 100% offline</p><p>Máximo 3 dispositivos</p><p>Sin sincronización cloud</p><p>Sin período de gracia</p></div>
            </AccordionItem>
            <AccordionItem key="sync" title="Plan Sync">
              <div className="space-y-2 text-sm"><p>Sincronización cloud</p><p>Máximo 5 dispositivos</p><p>Backup automático</p><p>7 días de gracia</p></div>
            </AccordionItem>
            <AccordionItem key="pro" title="Plan Pro">
              <div className="space-y-2 text-sm"><p>Multi-sede (hasta 3)</p><p>Máximo 10 dispositivos</p><p>Auditoría avanzada</p><p>14 días de gracia</p></div>
            </AccordionItem>
            <AccordionItem key="enterprise" title="Plan Enterprise">
              <div className="space-y-2 text-sm"><p>Sedes ilimitadas</p><p>Dispositivos ilimitados</p><p>SLA garantizado</p><p>30 días de gracia</p></div>
            </AccordionItem>
          </Accordion>
        </Card.Content>
      </Card>
    </div>
  );
}
