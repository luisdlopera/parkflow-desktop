import { Checkbox } from "@/components/bridge/Checkbox";
import QuestionHelp from "../QuestionHelp";
import { memo, useEffect } from "react";
import { useOnboardingData, useOnboardingMetadata } from "../OnboardingContext";
import { PAYMENT_OPTIONS_FOR_ONBOARDING } from "@/lib/payment-method-catalog";

function RequiredMark() {
  return <span className="text-danger ml-0.5" aria-hidden="true">*</span>;
}

const Step6PaymentMethods = memo(function Step6PaymentMethods() {
  const { stepData, setStepData, stepErrors } = useOnboardingData();
  const { status } = useOnboardingMetadata();
  
  // Opciones base que el tenant puede seleccionar (filtradas por plan)
  const allowedCodes = status?.availableOptionsByPlan?.paymentMethods as string[] | undefined;
  const options = PAYMENT_OPTIONS_FOR_ONBOARDING.filter(
    (item) => !allowedCodes || allowedCodes.includes(item.code)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">
          ¿Qué métodos de pago aceptas?
          <RequiredMark />
        </p>
        <QuestionHelp title="Métodos de pago">
          Selecciona todos los métodos de pago que aceptas en tu parqueadero.
        </QuestionHelp>
      </div>

      {stepErrors.paymentMethods && (
        <p className="text-xs text-danger" role="alert">{stepErrors.paymentMethods}</p>
      )}

      {options.length === 0 ? (
        <p className="text-sm text-default-500">No hay métodos de pago disponibles en el catálogo base.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((item) => (
            <Checkbox
              key={item.code}
              isSelected={Array.isArray(stepData.paymentMethods) && (stepData.paymentMethods as string[]).includes(item.code)}
              onChange={(checked: boolean) => {
                const prev = Array.isArray(stepData.paymentMethods) ? (stepData.paymentMethods as string[]) : [];
                const next = checked ? [...prev, item.code] : prev.filter((v) => v !== item.code);
                setStepData({ ...stepData, paymentMethods: next });
              }}
            >
              {item.label}
            </Checkbox>
          ))}
        </div>
      )}
    </div>
  );
});

export default Step6PaymentMethods;
