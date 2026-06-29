import { Input } from "@/components/bridge/Input";
import { Checkbox } from "@/components/bridge/Checkbox";
import { Switch } from "@/components/bridge/Switch";
import { Printer } from "lucide-react";
import { memo } from "react";
import { useOnboardingData, PRINTER_OPTIONS } from "../OnboardingContext";

const Step7Tickets = memo(function Step7Tickets() {
  const { stepData, setStepData } = useOnboardingData();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Printer className="w-4 h-4 text-default-400" />
          <p className="text-sm font-medium">Configuración de impresión</p>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-2">
          {PRINTER_OPTIONS.map((item) => (
            <Checkbox
              key={item.code}
              isSelected={stepData.printerType === item.code}
              onChange={(checked: boolean) => {
                if (checked) setStepData({ ...stepData, printerType: item.code });
              }}
            >
              <div className="flex flex-col">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-default-400">{item.description}</span>
              </div>
            </Checkbox>
          ))}
        </div>
        
        <div className="flex items-center justify-between p-3 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
          <span className="text-sm font-medium">Nombre de la impresora (opcional)</span>
          <Input
            className="w-48"
            aria-label="Nombre de la impresora"
            value={String(stepData.printerName ?? "")}
            onChange={(v) => setStepData({ ...stepData, printerName: v.target.value })}
            placeholder="Ej: EPSON-TM-T20"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Prefijo del número de ticket</span>
            <span className="text-xs text-default-400">Se usa al generar los consecutivos de tickets</span>
          </div>
          <Input
            className="w-32"
            aria-label="Prefijo del número de ticket"
            value={String(stepData.ticketPrefix ?? "T-")}
            onChange={(v) => setStepData({ ...stepData, ticketPrefix: v.target.value.toUpperCase().replace(/\s/g, "") })}
            placeholder="T-"
            maxLength={10}
          />
        </div>
      </div>
      
      <div className="border-t border-default-200 pt-4">
        <Switch isSelected={Boolean(stepData.allowReprint)} onChange={(v) => setStepData({ ...stepData, allowReprint: v })} aria-label="Alternar opción">
          Permitir reimpresión de tickets
        </Switch>
      </div>
      
      <div className="border-t border-default-200 pt-4">
        <Switch isSelected={Boolean(stepData.showTicketPreview)} onChange={(v) => setStepData({ ...stepData, showTicketPreview: v })} aria-label="Alternar opción">
          Mostrar vista previa del ticket antes de imprimir
        </Switch>
      </div>
    </div>
  );
});

export default Step7Tickets;
