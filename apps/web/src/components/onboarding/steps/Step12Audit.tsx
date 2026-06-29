import { memo } from "react";
import { useOnboardingMetadata, profileLabel } from "../OnboardingContext";

const Step12Audit = memo(function Step12Audit() {
  const { allProgressData, vehicleTypes, detectedProfile } = useOnboardingMetadata();

  const step2Data = allProgressData?.step_2 as Record<string, unknown> | undefined;
  const step3Data = allProgressData?.step_3 as Record<string, unknown> | undefined;
  const step4Data = allProgressData?.step_4 as Record<string, unknown> | undefined;
  const step5Data = allProgressData?.step_5 as Record<string, unknown> | undefined;

  return (
    <div className="space-y-4">
      <p className="text-sm text-default-600">Se mantendrá activa auditoría crítica: cobros, anulaciones y cierre de caja.</p>
      
      <div className="space-y-2">
        <p className="text-sm font-medium text-default-600">Resumen de configuración:</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="p-2 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
            <span className="text-xs text-default-500">Perfil:</span>
            <p className="text-sm font-medium">{profileLabel(detectedProfile)}</p>
          </div>
          <div className="p-2 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
            <span className="text-xs text-default-500">Vehículos:</span>
            <p className="text-sm font-medium">{vehicleTypes.length} tipos</p>
          </div>
          <div className="p-2 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
            <span className="text-xs text-default-500">Capacidad:</span>
            <p className="text-sm font-medium">{step2Data?.totalCapacity ? String(step2Data.totalCapacity) : "No configurada"}</p>
          </div>
          <div className="p-2 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
            <span className="text-xs text-default-500">Tarifa base:</span>
            <p className="text-sm font-medium">{step3Data?.baseValue ? `$${String(step3Data.baseValue)}` : "No configurada"}</p>
          </div>
          <div className="p-2 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
            <span className="text-xs text-default-500">Caja:</span>
            <p className="text-sm font-medium">{step4Data?.enabled ? "Sí" : "No"}</p>
          </div>
          <div className="p-2 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
            <span className="text-xs text-default-500">Turnos:</span>
            <p className="text-sm font-medium">{step5Data?.enabled ? "Sí" : "No"}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Step12Audit;
