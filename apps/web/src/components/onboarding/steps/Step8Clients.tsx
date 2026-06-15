import { Switch } from "@/components/ui/Switch";
import { useOnboarding } from "../OnboardingContext";

export default function Step8Clients() {
  const { stepData, setStepData } = useOnboarding();

  return (
    <div className="space-y-5">
      <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })}>
        ¿Manejas clientes frecuentes o mensualidades?
      </Switch>

      <p className="text-xs text-default-500">
        Activa esta opción si ofreces abonos, mensualidades o clientes frecuentes.
      </p>
    </div>
  );
}
