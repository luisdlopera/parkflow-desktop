"use client";

import { useState, useCallback } from "react";
import { Alert } from "@/components/bridge/Alert";
import { Tabs, Tab } from "@/components/bridge/Tabs";
import { Button } from "@/components/bridge/Button";
import { useDialog } from "@/components/ui/DialogProvider";
import { Save, RefreshCw } from "lucide-react";
import { DEFAULT_SETTINGS, type SystemSettings, type UpdateSetting } from "@/features/admin/types";
import { GeneralSettingsTab } from "@/features/admin/GeneralSettingsTab";
import { SecuritySettingsTab } from "@/features/admin/SecuritySettingsTab";
import { LicensingSettingsTab } from "@/features/admin/LicensingSettingsTab";
import { NotificationsSettingsTab } from "@/features/admin/NotificationsSettingsTab";
import { BackupSettingsTab } from "@/features/admin/BackupSettingsTab";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { confirm } = useDialog();

  const updateSetting: UpdateSetting = useCallback(<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = async () => {
    if (await confirm("¿Está seguro de restaurar la configuración por defecto?")) {
      setSettings(DEFAULT_SETTINGS);
      setSaveSuccess(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Alert color="warning" title="Disponible próximamente">
          Esta funcionalidad de configuración global se encuentra en desarrollo y estará disponible en futuras actualizaciones. Actualmente opera con simulaciones.
        </Alert>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
          <p className="text-default-500">Configure los parámetros globales del sistema de licenciamiento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="tertiary" startContent={<RefreshCw className="w-4 h-4" />} onPress={handleReset}>Restaurar</Button>
          <Button color="primary" startContent={<Save className="w-4 h-4" />} onPress={handleSave} isLoading={isSaving}>Guardar Cambios</Button>
        </div>
      </div>

      {saveSuccess && <Alert color="success" variant="solid">Configuración guardada exitosamente</Alert>}

      <Tabs selectedKey={activeTab} onChange={(k) => setActiveTab(k as string)}>
        <Tab key="general" title="General" />
        <Tab key="security" title="Seguridad" />
        <Tab key="licensing" title="Licenciamiento" />
        <Tab key="notifications" title="Notificaciones" />
        <Tab key="backup" title="Respaldos" />
      </Tabs>

      {activeTab === "general" && <GeneralSettingsTab settings={settings} onUpdate={updateSetting} />}
      {activeTab === "security" && <SecuritySettingsTab settings={settings} onUpdate={updateSetting} />}
      {activeTab === "licensing" && <LicensingSettingsTab settings={settings} onUpdate={updateSetting} />}
      {activeTab === "notifications" && <NotificationsSettingsTab settings={settings} onUpdate={updateSetting} />}
      {activeTab === "backup" && <BackupSettingsTab settings={settings} onUpdate={updateSetting} />}
    </div>
  );
}
