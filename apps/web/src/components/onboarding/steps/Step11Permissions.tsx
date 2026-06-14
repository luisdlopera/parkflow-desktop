import { Switch } from "@/components/ui/Switch";
import { useOnboarding } from "../OnboardingContext";

export default function Step11Permissions() {
  const { stepData, setStepData, canAdvancedPermissions } = useOnboarding();

  return (
    <div>
      <Switch isSelected={Boolean(stepData.advanced)} isDisabled={!canAdvancedPermissions} onChange={(v) => setStepData({ ...stepData, advanced: v })}>
        Permisos avanzados
      </Switch>
      {!canAdvancedPermissions && <p className="text-xs text-warning mt-1">Disponible en plan superior.</p>}
    </div>
  );
}
