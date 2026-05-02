"use client";

import { useState, useCallback } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Switch,
  Tabs,
  Tab,
  Select,
  SelectItem,
  Alert,
  Divider,
  Badge,
  Accordion,
  AccordionItem,
  Slider,
} from "@heroui/react";
import {
  Settings,
  Shield,
  Bell,
  Database,
  Key,
  Lock,
  Save,
  RefreshCw,
  Info,
} from "lucide-react";

interface SystemSettings {
  // General
  systemName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  debugMode: boolean;

  // Security
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  requireTwoFactor: boolean;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;

  // Licensing
  defaultTrialDays: number;
  defaultMaxDevices: number;
  heartbeatIntervalMinutes: number;
  gracePeriodDays: number;
  offlineLeaseHours: number;

  // Notifications
  emailNotificationsEnabled: boolean;
  slackWebhookUrl: string;
  notifyOnBlock: boolean;
  notifyOnLicenseExpire: boolean;
  notifyAdminsOnNewCompany: boolean;

  // Backup
  autoBackupEnabled: boolean;
  backupFrequencyHours: number;
  backupRetentionDays: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  systemName: "ParkFlow Licensing",
  supportEmail: "soporte@parkflow.local",
  maintenanceMode: false,
  debugMode: false,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  requireTwoFactor: false,
  passwordMinLength: 8,
  passwordRequireSpecialChars: true,
  defaultTrialDays: 14,
  defaultMaxDevices: 5,
  heartbeatIntervalMinutes: 30,
  gracePeriodDays: 7,
  offlineLeaseHours: 48,
  emailNotificationsEnabled: true,
  slackWebhookUrl: "",
  notifyOnBlock: true,
  notifyOnLicenseExpire: true,
  notifyAdminsOnNewCompany: true,
  autoBackupEnabled: true,
  backupFrequencyHours: 24,
  backupRetentionDays: 30,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateSetting = useCallback(<K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    if (confirm("¿Está seguro de restaurar la configuración por defecto?")) {
      setSettings(DEFAULT_SETTINGS);
      setSaveSuccess(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
          <p className="text-default-500">
            Configure los parámetros globales del sistema de licenciamiento
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="flat"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={handleReset}
          >
            Restaurar
          </Button>
          <Button
            color="primary"
            startContent={<Save className="w-4 h-4" />}
            onPress={handleSave}
            isLoading={isSaving}
          >
            Guardar Cambios
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <Alert color="success" variant="solid">
          Configuración guardada exitosamente
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs selectedKey={activeTab} onSelectionChange={(k) => setActiveTab(k as string)}>
        <Tab key="general" title="General" />
        <Tab key="security" title="Seguridad" />
        <Tab key="licensing" title="Licenciamiento" />
        <Tab key="notifications" title="Notificaciones" />
        <Tab key="backup" title="Respaldos" />
      </Tabs>

      {/* General Settings */}
      {activeTab === "general" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Configuración General</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre del Sistema"
                value={settings.systemName}
                onChange={(e) => updateSetting("systemName", e.target.value)}
                description="Nombre que aparecerá en los correos y reportes"
              />
              <Input
                label="Email de Soporte"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => updateSetting("supportEmail", e.target.value)}
                description="Email de contacto para soporte técnico"
              />
            </div>

            <Divider />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Modo Mantenimiento</p>
                  <p className="text-sm text-default-500">
                    Bloquea el acceso a la API para mantenimiento
                  </p>
                </div>
                <Switch
                  isSelected={settings.maintenanceMode}
                  onValueChange={(v) => updateSetting("maintenanceMode", v)}
                  color="warning"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Modo Debug</p>
                  <p className="text-sm text-default-500">
                    Habilita logs detallados (solo para desarrollo)
                  </p>
                </div>
                <Switch
                  isSelected={settings.debugMode}
                  onValueChange={(v) => updateSetting("debugMode", v)}
                  color="primary"
                />
              </div>
            </div>

            {settings.maintenanceMode && (
              <Alert color="warning">
                <p>
                  <strong>Advertencia:</strong> El modo mantenimiento bloqueará todas las
                  peticiones a la API. Los dispositivos desktop no podrán sincronizar ni validar
                  licencias.
                </p>
              </Alert>
            )}
          </CardBody>
        </Card>
      )}

      {/* Security Settings */}
      {activeTab === "security" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-danger" />
                <h3 className="text-lg font-semibold">Seguridad de Sesiones</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Timeout de Sesión</p>
                  <p className="text-xs text-default-500 mb-2">
                    {settings.sessionTimeoutMinutes} minutos
                  </p>
                  <Slider
                    size="sm"
                    step={5}
                    minValue={5}
                    maxValue={240}
                    value={settings.sessionTimeoutMinutes}
                    onChange={(v) => updateSetting("sessionTimeoutMinutes", v as number)}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Intentos de Login</p>
                  <p className="text-xs text-default-500 mb-2">
                    {settings.maxLoginAttempts} intentos
                  </p>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={3}
                    maxValue={10}
                    value={settings.maxLoginAttempts}
                    onChange={(v) => updateSetting("maxLoginAttempts", v as number)}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Duración Bloqueo</p>
                  <p className="text-xs text-default-500 mb-2">
                    {settings.lockoutDurationMinutes} minutos
                  </p>
                  <Slider
                    size="sm"
                    step={5}
                    minValue={5}
                    maxValue={120}
                    value={settings.lockoutDurationMinutes}
                    onChange={(v) => updateSetting("lockoutDurationMinutes", v as number)}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-warning" />
                <h3 className="text-lg font-semibold">Política de Contraseñas</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Requerir 2FA para Super Admins</p>
                  <p className="text-sm text-default-500">
                    Obliga autenticación de dos factores a usuarios con rol Super Admin
                  </p>
                </div>
                <Switch
                  isSelected={settings.requireTwoFactor}
                  onValueChange={(v) => updateSetting("requireTwoFactor", v)}
                  color="warning"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Longitud Mínima</p>
                  <p className="text-xs text-default-500 mb-2">
                    {settings.passwordMinLength} caracteres
                  </p>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={6}
                    maxValue={16}
                    value={settings.passwordMinLength}
                    onChange={(v) => updateSetting("passwordMinLength", v as number)}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    isSelected={settings.passwordRequireSpecialChars}
                    onValueChange={(v) => updateSetting("passwordRequireSpecialChars", v)}
                  />
                  <span className="text-sm">Requerir caracteres especiales</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Licensing Settings */}
      {activeTab === "licensing" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Configuración de Licencias</h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Días de Prueba por Defecto</p>
                  <p className="text-xs text-default-500 mb-2">{settings.defaultTrialDays} días</p>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={7}
                    maxValue={30}
                    value={settings.defaultTrialDays}
                    onChange={(v) => updateSetting("defaultTrialDays", v as number)}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Dispositivos Máximos por Defecto</p>
                  <p className="text-xs text-default-500 mb-2">
                    {settings.defaultMaxDevices} dispositivos
                  </p>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={1}
                    maxValue={20}
                    value={settings.defaultMaxDevices}
                    onChange={(v) => updateSetting("defaultMaxDevices", v as number)}
                  />
                </div>
              </div>

              <Divider />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Intervalo Heartbeat</p>
                  <p className="text-xs text-default-500 mb-2">
                    {settings.heartbeatIntervalMinutes} minutos
                  </p>
                  <Slider
                    size="sm"
                    step={5}
                    minValue={5}
                    maxValue={60}
                    value={settings.heartbeatIntervalMinutes}
                    onChange={(v) => updateSetting("heartbeatIntervalMinutes", v as number)}
                  />
                  <p className="text-xs text-default-400 mt-1">
                    Frecuencia de reporte de dispositivos
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Período de Gracia</p>
                  <p className="text-xs text-default-500 mb-2">{settings.gracePeriodDays} días</p>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={0}
                    maxValue={30}
                    value={settings.gracePeriodDays}
                    onChange={(v) => updateSetting("gracePeriodDays", v as number)}
                  />
                  <p className="text-xs text-default-400 mt-1">
                    Días adicionales tras vencimiento
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Lease Offline</p>
                  <p className="text-xs text-default-500 mb-2">{settings.offlineLeaseHours} horas</p>
                  <Slider
                    size="sm"
                    step={4}
                    minValue={12}
                    maxValue={168}
                    value={settings.offlineLeaseHours}
                    onChange={(v) => updateSetting("offlineLeaseHours", v as number)}
                  />
                  <p className="text-xs text-default-400 mt-1">
                    Horas de operación offline permitidas
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Límites por Plan</h3>
            </CardHeader>
            <CardBody>
              <Accordion>
                <AccordionItem key="local" title="Plan Local">
                  <div className="space-y-2 text-sm">
                    <p>Operación 100% offline</p>
                    <p>Máximo 3 dispositivos</p>
                    <p>Sin sincronización cloud</p>
                    <p>Sin período de gracia</p>
                  </div>
                </AccordionItem>
                <AccordionItem key="sync" title="Plan Sync">
                  <div className="space-y-2 text-sm">
                    <p>Sincronización cloud</p>
                    <p>Máximo 5 dispositivos</p>
                    <p>Backup automático</p>
                    <p>7 días de gracia</p>
                  </div>
                </AccordionItem>
                <AccordionItem key="pro" title="Plan Pro">
                  <div className="space-y-2 text-sm">
                    <p>Multi-sede (hasta 3)</p>
                    <p>Máximo 10 dispositivos</p>
                    <p>Auditoría avanzada</p>
                    <p>14 días de gracia</p>
                  </div>
                </AccordionItem>
                <AccordionItem key="enterprise" title="Plan Enterprise">
                  <div className="space-y-2 text-sm">
                    <p>Sedes ilimitadas</p>
                    <p>Dispositivos ilimitados</p>
                    <p>SLA garantizado</p>
                    <p>30 días de gracia</p>
                  </div>
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Notifications Settings */}
      {activeTab === "notifications" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-warning" />
              <h3 className="text-lg font-semibold">Configuración de Notificaciones</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notificaciones por Email</p>
                <p className="text-sm text-default-500">
                  Habilitar envío de notificaciones por correo electrónico
                </p>
              </div>
              <Switch
                isSelected={settings.emailNotificationsEnabled}
                onValueChange={(v) => updateSetting("emailNotificationsEnabled", v)}
                color="primary"
              />
            </div>

            <Input
              label="Webhook de Slack (opcional)"
              value={settings.slackWebhookUrl}
              onChange={(e) => updateSetting("slackWebhookUrl", e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              description="URL para enviar notificaciones a Slack"
            />

            <Divider />

            <h4 className="font-medium">Eventos a Notificar</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bloqueo de Dispositivo</p>
                  <p className="text-sm text-default-500">
                    Notificar cuando un dispositivo sea bloqueado
                  </p>
                </div>
                <Switch
                  isSelected={settings.notifyOnBlock}
                  onValueChange={(v) => updateSetting("notifyOnBlock", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Licencia por Vencer</p>
                  <p className="text-sm text-default-500">
                    Notificar 7, 3 y 1 días antes del vencimiento
                  </p>
                </div>
                <Switch
                  isSelected={settings.notifyOnLicenseExpire}
                  onValueChange={(v) => updateSetting("notifyOnLicenseExpire", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Nueva Empresa Registrada</p>
                  <p className="text-sm text-default-500">
                    Notificar a administradores cuando se cree una empresa
                  </p>
                </div>
                <Switch
                  isSelected={settings.notifyAdminsOnNewCompany}
                  onValueChange={(v) => updateSetting("notifyAdminsOnNewCompany", v)}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Backup Settings */}
      {activeTab === "backup" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-success" />
              <h3 className="text-lg font-semibold">Configuración de Respaldos</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Respaldo Automático</p>
                <p className="text-sm text-default-500">
                  Crear respaldos automáticos de la base de datos
                </p>
              </div>
              <Switch
                isSelected={settings.autoBackupEnabled}
                onValueChange={(v) => updateSetting("autoBackupEnabled", v)}
                color="success"
              />
            </div>

            {settings.autoBackupEnabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Frecuencia de Respaldo</p>
                    <p className="text-xs text-default-500 mb-2">
                      Cada {settings.backupFrequencyHours} horas
                    </p>
                    <Slider
                      size="sm"
                      step={1}
                      minValue={1}
                      maxValue={168}
                      value={settings.backupFrequencyHours}
                      onChange={(v) => updateSetting("backupFrequencyHours", v as number)}
                      marks={[
                        { value: 1, label: "1h" },
                        { value: 24, label: "24h" },
                        { value: 72, label: "3d" },
                        { value: 168, label: "7d" },
                      ]}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Retención</p>
                    <p className="text-xs text-default-500 mb-2">
                      {settings.backupRetentionDays} días
                    </p>
                    <Slider
                      size="sm"
                      step={1}
                      minValue={7}
                      maxValue={365}
                      value={settings.backupRetentionDays}
                      onChange={(v) => updateSetting("backupRetentionDays", v as number)}
                    />
                  </div>
                </div>

                <Alert color="primary">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 mt-0.5" />
                    <div>
                      <p className="font-medium">Información de Respaldos</p>
                      <p className="text-sm">
                        Los respaldos se almacenan en el servidor y pueden descargarse desde la
                        sección de auditoría. Se recomienda también configurar respaldos externos.
                      </p>
                    </div>
                  </div>
                </Alert>

                <div className="flex gap-2">
                  <Button variant="flat" startContent={<Database className="w-4 h-4" />}>
                    Respaldo Manual
                  </Button>
                  <Button variant="flat" startContent={<RefreshCw className="w-4 h-4" />}>
                    Restaurar Respaldo
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
