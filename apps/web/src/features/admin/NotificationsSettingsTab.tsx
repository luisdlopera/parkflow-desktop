"use client";
import { Separator } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { Input } from "@/components/bridge/Input";
import { Switch } from "@/components/bridge/Switch";
import { Bell } from "lucide-react";
import type { SystemSettings, UpdateSetting } from "./types";

export function NotificationsSettingsTab({ settings, onUpdate }: { settings: SystemSettings; onUpdate: UpdateSetting }) {
  return (
    <Card>
      <Card.Header>
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-warning" />
          <h3 className="text-lg font-semibold">Configuración de Notificaciones</h3>
        </div>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Notificaciones por Email</p>
            <p className="text-sm text-default-500">Habilitar envío de notificaciones por correo electrónico</p>
          </div>
          <Switch isSelected={settings.emailNotificationsEnabled} onChange={(v) => onUpdate("emailNotificationsEnabled", v)} color="primary" aria-label="Alternar opción" />
        </div>
        <Input label="Webhook de Slack (opcional)" value={settings.slackWebhookUrl} onChange={(e) => onUpdate("slackWebhookUrl", e.target.value)} placeholder="https://hooks.slack.com/services/..." description="URL para enviar notificaciones a Slack" />
        <Separator />
        <h4 className="font-medium">Eventos a Notificar</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Bloqueo de Dispositivo</p>
              <p className="text-sm text-default-500">Notificar cuando un dispositivo sea bloqueado</p>
            </div>
            <Switch isSelected={settings.notifyOnBlock} onChange={(v) => onUpdate("notifyOnBlock", v)} aria-label="Alternar opción" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Licencia por Vencer</p>
              <p className="text-sm text-default-500">Notificar 7, 3 y 1 días antes del vencimiento</p>
            </div>
            <Switch isSelected={settings.notifyOnLicenseExpire} onChange={(v) => onUpdate("notifyOnLicenseExpire", v)} aria-label="Alternar opción" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Nueva Empresa Registrada</p>
              <p className="text-sm text-default-500">Notificar a administradores cuando se cree una empresa</p>
            </div>
            <Switch isSelected={settings.notifyAdminsOnNewCompany} onChange={(v) => onUpdate("notifyAdminsOnNewCompany", v)} aria-label="Alternar opción" />
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
