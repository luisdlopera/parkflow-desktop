"use client";

import { memo, useEffect, useMemo } from "react";
import { PricingBuilder, pricingConfigurationToStepData, stepDataToPricingConfiguration } from "@/features/pricing-builder";
import { useOnboardingData, useOnboardingMetadata, useOnboardingNavigation } from "../OnboardingContext";

type Step3RatesProps = {
  focusErrorPath?: string | null;
  onFocusErrorHandled?: () => void;
};

const Step3Rates = memo(function Step3Rates({ focusErrorPath, onFocusErrorHandled }: Step3RatesProps) {
  const { stepData, setStepData, stepErrors } = useOnboardingData();
  const { vehicleTypes } = useOnboardingMetadata();
  const { persistStep, step } = useOnboardingNavigation();

  const config = useMemo(() => stepDataToPricingConfiguration(stepData), [stepData]);

  useEffect(() => {
    if (!focusErrorPath) return;
    const timer = window.setTimeout(() => {
      const element = document.getElementById("pricing-builder-step3");
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
      onFocusErrorHandled?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusErrorPath, onFocusErrorHandled]);

  return (
    <div id="pricing-builder-step3" className="animate-in fade-in duration-300">
      <PricingBuilder
        mode="onboarding"
        value={config}
        vehicleTypes={vehicleTypes}
        errors={stepErrors}
        onChange={(next) => setStepData((prev) => ({ ...prev, ...pricingConfigurationToStepData(next) }))}
        onSubmit={async () => {
          await persistStep(step);
        }}
        focusErrorPath={focusErrorPath}
        onFocusErrorHandled={onFocusErrorHandled}
      />
    </div>
  );
});

export default Step3Rates;
