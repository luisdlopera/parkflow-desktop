"use client";

import { useState } from "react";
import { Select, SelectItem } from "@heroui/react";

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
    <div className="space-y-6 max-w-md p-6">
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
    </div>
  );
}
