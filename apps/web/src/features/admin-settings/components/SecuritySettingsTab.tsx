"use client";
import { Card } from "@/components/ui/Card";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { Shield, Key } from "lucide-react";
import type { SystemSettings, UpdateSetting } from "../types";

export function SecuritySettingsTab({ settings, onUpdate }: { settings: SystemSettings; onUpdate: UpdateSetting }) {
  return (
    <div className="space-y-4">
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-danger" />
            <h3 className="text-lg font-semibold">Seguridad de Sesiones</h3>
          </div>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Timeout de Sesión</p>
              <p className="text-xs text-default-500 mb-2">{settings.sessionTimeoutMinutes} minutos</p>
              <Slider size="sm" step={5} minValue={5} maxValue={240} value={settings.sessionTimeoutMinutes} onChange={(v) => onUpdate("sessionTimeoutMinutes", v as number)} />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Intentos de Login</p>
              <p className="text-xs text-default-500 mb-2">{settings.maxLoginAttempts} intentos</p>
              <Slider size="sm" step={1} minValue={3} maxValue={10} value={settings.maxLoginAttempts} onChange={(v) => onUpdate("maxLoginAttempts", v as number)} />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Duración Bloqueo</p>
              <p className="text-xs text-default-500 mb-2">{settings.lockoutDurationMinutes} minutos</p>
              <Slider size="sm" step={5} minValue={5} maxValue={120} value={settings.lockoutDurationMinutes} onChange={(v) => onUpdate("lockoutDurationMinutes", v as number)} />
            </div>
          </div>
        </Card.Content>
      </Card>
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-semibold">Política de Contraseñas</h3>
          </div>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Requerir 2FA para Super Admins</p>
              <p className="text-sm text-default-500">Obliga autenticación de dos factores a usuarios con rol Super Admin</p>
            </div>
            <Switch isSelected={settings.requireTwoFactor} onChange={(v) => onUpdate("requireTwoFactor", v)} color="warning" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Longitud Mínima</p>
              <p className="text-xs text-default-500 mb-2">{settings.passwordMinLength} caracteres</p>
              <Slider size="sm" step={1} minValue={6} maxValue={16} value={settings.passwordMinLength} onChange={(v) => onUpdate("passwordMinLength", v as number)} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch isSelected={settings.passwordRequireSpecialChars} onChange={(v) => onUpdate("passwordRequireSpecialChars", v)} />
              <span className="text-sm">Requerir caracteres especiales</span>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
