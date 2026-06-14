import { Checkbox } from "@/components/ui/Checkbox";
import QuestionHelp from "../QuestionHelp";
import { useOnboarding, PAYMENT_OPTIONS } from "../OnboardingContext";

export default function Step6PaymentMethods() {
  const { stepData, setStepData } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">¿Qué métodos de pago aceptas?</p>
        <QuestionHelp title="Métodos de pago">
          Selecciona todos los métodos de pago que aceptas en tu parqueadero.
        </QuestionHelp>
      </div>
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
