import { Checkbox } from "@/components/ui/Checkbox";
import QuestionHelp from "../QuestionHelp";
import { useOnboarding, VEHICLE_OPTIONS, profileLabel, profileDescription, inferOperationalProfile } from "../OnboardingContext";

export default function Step1VehicleTypes() {
  const { stepData, setStepData } = useOnboarding();
  const vehicleTypes = Array.isArray(stepData.vehicleTypes) ? (stepData.vehicleTypes as string[]) : [];
  const detectedProfile = inferOperationalProfile(vehicleTypes);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">¿Qué tipos de vehículos recibe tu parqueadero?</p>
        <QuestionHelp title="Tipos de vehículo">
          Selecciona todos los tipos de vehículos que ingresan a tu parqueadero. 
          Esto determinará el perfil operacional y las vistas dinámicas del sistema.
        </QuestionHelp>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {VEHICLE_OPTIONS.map((item) => (
          <Checkbox
            key={item.code}
            isSelected={vehicleTypes.includes(item.code)}
            onChange={(checked: boolean) => {
              const prev = vehicleTypes;
              const next = checked ? [...prev, item.code] : prev.filter((v) => v !== item.code);
              const profile = inferOperationalProfile(next);
              setStepData({ ...stepData, vehicleTypes: next, operationalProfile: profile });
            }}
          >
            <div className="flex flex-col">
              <span className="font-medium">{item.label}</span>
              <span className="text-xs text-default-400">{item.description}</span>
            </div>
          </Checkbox>
        ))}
      </div>

      {vehicleTypes.length > 0 && (
        <div className="mt-4 p-4 rounded-lg bg-primary-50 border border-primary-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-primary">Perfil detectado:</span>
            <span className="text-sm font-bold text-primary">{profileLabel(detectedProfile)}</span>
          </div>
          <p className="text-xs text-primary-600">{profileDescription(detectedProfile)}</p>
        </div>
      )}

      {vehicleTypes.length === 0 && (
        <div className="mt-4 p-3 rounded-lg bg-warning-50 border border-warning-200">
          <p className="text-xs text-warning-600">
            Selecciona al menos un tipo de vehículo para continuar.
          </p>
        </div>
      )}
    </div>
  );
}
