import { Switch } from "@/components/bridge/Switch";
import { memo } from "react";
import { useOnboardingData } from "../OnboardingContext";

const Step8Clients = memo(function Step8Clients() {
  const { stepData, setStepData } = useOnboardingData();

  return (
    <div className="space-y-5">
      <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })} aria-label="Alternar opción">
        ¿Manejas clientes frecuentes o mensualidades?
      </Switch>

      <p className="text-xs text-default-500">
        Activa esta opción si ofreces abonos, mensualidades o clientes frecuentes.
      </p>
    </div>
  );
});

export default Step8Clients;
