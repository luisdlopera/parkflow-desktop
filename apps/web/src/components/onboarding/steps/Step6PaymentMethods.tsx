import { Checkbox } from "@/components/ui/Checkbox";
import QuestionHelp from "../QuestionHelp";
import { useOnboarding, PAYMENT_OPTIONS } from "../OnboardingContext";

function RequiredMark() {
  return <span className="text-danger ml-0.5" aria-hidden="true">*</span>;
}

export default function Step6PaymentMethods() {
  const { stepData, setStepData, stepErrors } = useOnboarding();

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

      <div className="grid gap-3 sm:grid-cols-2">
        {PAYMENT_OPTIONS.map((item) => (
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
    </div>
  );
}
