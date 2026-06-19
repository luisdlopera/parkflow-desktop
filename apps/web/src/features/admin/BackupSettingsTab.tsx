"use client";
import { Alert } from "@/components/bridge/Alert";
import { Button } from "@/components/bridge/Button";
import { Card } from "@/components/bridge/Card";
import { Slider } from "@/components/bridge/Slider";
import { Switch } from "@/components/bridge/Switch";
import { Database, RefreshCw, Info } from "lucide-react";
import type { SystemSettings, UpdateSetting } from "./types";

export function BackupSettingsTab({ settings, onUpdate }: { settings: SystemSettings; onUpdate: UpdateSetting }) {
  return (
    <Card>
      <Card.Header>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-success" />
          <h3 className="text-lg font-semibold">Configuración de Respaldos</h3>
        </div>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Respaldo Automático</p>
            <p className="text-sm text-default-500">Crear respaldos automáticos de la base de datos</p>
          </div>
          <Switch isSelected={settings.autoBackupEnabled} onChange={(v) => onUpdate("autoBackupEnabled", v)} color="success" aria-label="Alternar opción" />
        </div>
        {settings.autoBackupEnabled && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Frecuencia de Respaldo</p>
                <p className="text-xs text-default-500 mb-2">Cada {settings.backupFrequencyHours} horas</p>
                <Slider size="sm" step={1} minValue={1} maxValue={168} value={settings.backupFrequencyHours} onChange={(v) => onUpdate("backupFrequencyHours", v as number)}
                  marks={[{ value: 1, label: "1h" }, { value: 24, label: "24h" }, { value: 72, label: "3d" }, { value: 168, label: "7d" }]} />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Retención</p>
                <p className="text-xs text-default-500 mb-2">{settings.backupRetentionDays} días</p>
                <Slider size="sm" step={1} minValue={7} maxValue={365} value={settings.backupRetentionDays} onChange={(v) => onUpdate("backupRetentionDays", v as number)} />
              </div>
            </div>
            <Alert color="primary">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 mt-0.5" />
                <div>
                  <p className="font-medium">Información de Respaldos</p>
                  <p className="text-sm">Los respaldos se almacenan en el servidor y pueden descargarse desde la sección de auditoría. Se recomienda también configurar respaldos externos.</p>
                </div>
              </div>
            </Alert>
            <div className="flex gap-2">
              <Button variant="tertiary" startContent={<Database className="w-4 h-4" />}>Respaldo Manual</Button>
              <Button variant="tertiary" startContent={<RefreshCw className="w-4 h-4" />}>Restaurar Respaldo</Button>
            </div>
          </>
        )}
      </Card.Content>
    </Card>
  );
}
