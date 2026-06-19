"use client";
import { Separator } from "@heroui/react";
import { Alert } from "@/components/bridge/Alert";
import { Card } from "@/components/bridge/Card";
import { Input } from "@/components/bridge/Input";
import { Switch } from "@/components/bridge/Switch";
import { Settings } from "lucide-react";
import type { SystemSettings, UpdateSetting } from "./types";

export function GeneralSettingsTab({ settings, onUpdate }: { settings: SystemSettings; onUpdate: UpdateSetting }) {
  return (
    <Card>
      <Card.Header>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Configuración General</h3>
        </div>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre del Sistema" value={settings.systemName} onChange={(e) => onUpdate("systemName", e.target.value)} description="Nombre que aparecerá en los correos y reportes" />
          <Input label="Email de Soporte" type="email" value={settings.supportEmail} onChange={(e) => onUpdate("supportEmail", e.target.value)} description="Email de contacto para soporte técnico" />
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Modo Mantenimiento</p>
              <p className="text-sm text-default-500">Bloquea el acceso a la API para mantenimiento</p>
            </div>
            <Switch isSelected={settings.maintenanceMode} onChange={(v) => onUpdate("maintenanceMode", v)} color="warning" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Modo Debug</p>
              <p className="text-sm text-default-500">Habilita logs detallados (solo para desarrollo)</p>
            </div>
            <Switch isSelected={settings.debugMode} onChange={(v) => onUpdate("debugMode", v)} color="primary" />
          </div>
        </div>
        {settings.maintenanceMode && (
          <Alert color="warning">
            <p><strong>Advertencia:</strong> El modo mantenimiento bloqueará todas las peticiones a la API. Los dispositivos desktop no podrán sincronizar ni validar licencias.</p>
          </Alert>
        )}
      </Card.Content>
    </Card>
  );
}
