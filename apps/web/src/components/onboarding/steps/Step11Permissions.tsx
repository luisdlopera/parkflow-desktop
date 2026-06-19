import { Switch } from "@/components/bridge/Switch";
import { memo } from "react";
import { useOnboardingData, useOnboardingMetadata } from "../OnboardingContext";

const Step11Permissions = memo(function Step11Permissions() {
  const { stepData, setStepData } = useOnboardingData();
  const { canAdvancedPermissions } = useOnboardingMetadata();

  return (
    <div>
      <Switch isSelected={Boolean(stepData.advanced)} isDisabled={!canAdvancedPermissions} onChange={(v) => setStepData({ ...stepData, advanced: v })} aria-label="Alternar opción">
        Permisos avanzados
      </Switch>
      {!canAdvancedPermissions && <p className="text-xs text-warning mt-1">Disponible en plan superior.</p>}
    </div>
  );
});

export default Step11Permissions;
