"use client";
import { ListBox } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { Select } from "@/components/bridge/Select";
import { Switch } from "@/components/bridge/Switch";
import { useEffect, useState } from "react";
import { PageBackButton } from "@/components/layout/PageBackButton";

const UI_SETTINGS_KEY = "parkflow_ui_settings";
const UI_SETTINGS_EVENT = "parkflow-ui-settings-changed";

export default function SettingsPage() {
  const [language, setLanguage] = useState("en");
  const [uiSettings, setUiSettings] = useState({
    showSystemStatus: true,
    showKeyboardShortcuts: true
  });

  useEffect(() => {
    const saved = localStorage.getItem(UI_SETTINGS_KEY);
    if (saved) {
      try {
        setUiSettings(JSON.parse(saved));
      } catch {
        localStorage.removeItem(UI_SETTINGS_KEY);
      }
    }
  }, []);

  const updateUiSetting = (key: keyof typeof uiSettings, value: boolean) => {
    const updated = { ...uiSettings, [key]: value };
    setUiSettings(updated);
    localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(UI_SETTINGS_EVENT, { detail: updated }));
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex flex-wrap items-center gap-3">
        <PageBackButton />
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Preferencias</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground dark:text-neutral-100">
            Idioma e interfaz
          </h1>
        </div>
      </div>

      <Select
        label="Seleccionar idioma"
        
        value={[language]}
        onChange={(keys: Set<string | number | boolean | null | undefined>) => setLanguage(Array.from(keys)[0] as string)}
        data-testid="language-select"
      >
      <Select.Trigger aria-label="Seleccionar opción">
        <Select.Value aria-label="Seleccionar opción" />
        <Select.Indicator aria-label="Seleccionar opción" />
      </Select.Trigger>
      <Select.Popover aria-label="Seleccionar opción">
        <ListBox>

        <ListBox.Item key="en" textValue="English">English</ListBox.Item>
        <ListBox.Item key="es" textValue="Español">Español</ListBox.Item>
      
        </ListBox>
      </Select.Popover>
    </Select>

      <div className="surface rounded-2xl p-6 border border-default-100 dark:border-neutral-800">
        <p data-testid="welcome-text" className="text-xl font-medium text-foreground dark:text-neutral-100">
          {language === "es" ? "Bienvenido a ParkFlow" : "Welcome to ParkFlow"}
        </p>
        <p className="text-sm text-default-500 dark:text-neutral-400 mt-1">
          {language === "es"
            ? "El sistema se ha configurado correctamente."
            : "The system has been configured correctly."}
        </p>
      </div>

      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Personalización</p>
        <h2 className="text-2xl font-semibold text-foreground dark:text-neutral-100">Interfaz</h2>
        <p className="mt-2 text-sm text-default-600 dark:text-neutral-400">
          Estas preferencias se guardan solo en tu navegador y no afectan a otros usuarios.
        </p>
      </div>

      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-foreground dark:text-neutral-100">
            Personalización del Sidebar
          </h3>
        </Card.Header>
        <Card.Content className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground dark:text-neutral-200">Mostrar estado del sistema</p>
              <p className="text-sm text-default-500 dark:text-neutral-400">
                Muestra el indicador &quot;Sistema operativo&quot; en el sidebar con el punto verde de estado.
              </p>
            </div>
            <Switch
              isSelected={uiSettings.showSystemStatus}
              onChange={(checked) => updateUiSetting("showSystemStatus", checked)}
              size="lg"
              color="primary" aria-label="Alternar opción"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground dark:text-neutral-200">Mostrar atajos de teclado</p>
              <p className="text-sm text-default-500 dark:text-neutral-400">
                Muestra la sección de atajos de teclado (F1, F2, F3, F4, Esc) en la parte inferior del sidebar.
              </p>
            </div>
            <Switch
              isSelected={uiSettings.showKeyboardShortcuts}
              onChange={(checked) => updateUiSetting("showKeyboardShortcuts", checked)}
              size="lg"
              color="primary" aria-label="Alternar opción"
            />
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
