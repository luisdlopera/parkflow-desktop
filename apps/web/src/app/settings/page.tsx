"use client";

import { useEffect, useState } from "react";
import { Select, SelectItem, Switch } from "@heroui/react";
import { Card, CardBody, CardHeader } from "@heroui/card";

export default function SettingsPage() {
  const [language, setLanguage] = useState("en");
  const [uiSettings, setUiSettings] = useState({
    showSystemStatus: true,
    showKeyboardShortcuts: true
  });

  useEffect(() => {
    const saved = localStorage.getItem("parkflow_ui_settings");
    if (saved) {
      try {
        setUiSettings(JSON.parse(saved));
      } catch {
        localStorage.removeItem("parkflow_ui_settings");
      }
    }
  }, []);

  const updateUiSetting = (key: keyof typeof uiSettings, value: boolean) => {
    const updated = { ...uiSettings, [key]: value };
    setUiSettings(updated);
    localStorage.setItem("parkflow_ui_settings", JSON.stringify(updated));
  };

  return (
    <div className="space-y-8 max-w-2xl p-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Configuración</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Idioma</h1>
      </div>
      
      <Select
        label="Seleccionar idioma"
        variant="flat"
        selectedKeys={[language]}
        onSelectionChange={(keys) => setLanguage(Array.from(keys)[0] as string)}
      >
        <SelectItem key="en">English</SelectItem>
        <SelectItem key="es">Español</SelectItem>
      </Select>

      <div className="surface rounded-2xl p-6 border border-slate-100">
        <p data-testid="welcome-text" className="text-xl font-medium text-slate-800">
          {language === "es" ? "Bienvenido a ParkFlow" : "Welcome to ParkFlow"}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {language === "es" ? "El sistema se ha configurado correctamente." : "The system has been configured correctly."}
        </p>
      </div>

      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Preferencias</p>
        <h2 className="text-2xl font-semibold text-slate-900">Interfaz</h2>
        <p className="mt-2 text-sm text-slate-600">
          Estas preferencias se guardan solo en tu navegador y no afectan a otros usuarios.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-900">Personalización del Sidebar</h3>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Mostrar estado del sistema</p>
              <p className="text-sm text-slate-500">
                Muestra el indicador "Sistema operativo" en el sidebar con el punto verde de estado.
              </p>
            </div>
            <Switch
              isSelected={uiSettings.showSystemStatus}
              onValueChange={(checked) => updateUiSetting("showSystemStatus", checked)}
              size="lg"
              color="primary"
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
              isSelected={uiSettings.showKeyboardShortcuts}
              onValueChange={(checked) => updateUiSetting("showKeyboardShortcuts", checked)}
              size="lg"
              color="primary"
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
