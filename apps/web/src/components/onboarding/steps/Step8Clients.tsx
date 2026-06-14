import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import { useOnboarding } from "../OnboardingContext";

export default function Step8Clients() {
  const { stepData, setStepData, vehicleTypes } = useOnboarding();

  return (
    <div className="space-y-4">
      <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })}>
        ¿Manejas clientes frecuentes o mensualidades?
      </Switch>
      
      {vehicleTypes.includes("MOTORCYCLE") && (
        <div className="border-t border-default-200 pt-4">
          <Switch isSelected={Boolean(stepData.enableHelmetSection)} onChange={(v) => setStepData({ ...stepData, enableHelmetSection: v })}>
            ¿Registras cascos/cascos de moto en custodia?
          </Switch>
          
          {Boolean(stepData.enableHelmetSection) && (
            <div className="mt-3 p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg space-y-3">
              <p className="text-xs text-default-600">
                Se mostrará una sección adicional en el ingreso para registrar el número de casco y observaciones.
              </p>
              
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-default-700">
                  ¿Cuántas fichas/casilleros necesitas?
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  className="w-24"
                  aria-label="Cantidad de fichas de casco"
                  value={String(stepData.helmetLockerCount ?? 10)}
                  onChange={(e) => setStepData({ ...stepData, helmetLockerCount: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })}
                />
              </div>
              <p className="text-xs text-default-500">
                Se crearán automáticamente las fichas F-01, F-02, etc. al finalizar la configuración.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
