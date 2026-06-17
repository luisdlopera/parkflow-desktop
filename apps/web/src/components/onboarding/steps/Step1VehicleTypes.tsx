import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import QuestionHelp from "../QuestionHelp";
import {
  useOnboarding,
  VEHICLE_OPTIONS,
  profileLabel,
  profileDescription,
  inferOperationalProfile,
} from "../OnboardingContext";

function RequiredMark() {
  return (
    <span className="text-danger ml-0.5" aria-hidden="true">
      *
    </span>
  );
}

type HelmetHandling = "LOCKERS" | "MANUAL" | "NONE";

const HELMET_OPTIONS: Array<{ code: HelmetHandling; label: string; description: string }> = [
  {
    code: "LOCKERS",
    label: "Lockers numerados",
    description: "El sistema controla automáticamente la disponibilidad y ocupación de lockers",
  },
  {
    code: "MANUAL",
    label: "Custodia manual",
    description: "El parqueadero administra los cascos sin control de lockers en el sistema",
  },
  { code: "NONE", label: "No custodio cascos", description: "No recibo ni custodio cascos" },
];

const MAX_HELMET_LOCKERS = 9999;

export default function Step1VehicleTypes() {
  const { stepData, setStepData, stepErrors } = useOnboarding();
  const vehicleTypes = Array.isArray(stepData.vehicleTypes)
    ? (stepData.vehicleTypes as string[])
    : [];
  const detectedProfile = inferOperationalProfile(vehicleTypes);
  const hasMotorcycles = vehicleTypes.includes("MOTORCYCLE");
  const helmetHandling = (stepData.helmetHandling as HelmetHandling | undefined) ?? undefined;
  const helmetTokenCount =
    typeof stepData.helmetTokenCount === "number" ? stepData.helmetTokenCount : undefined;

  const setHelmetHandling = (value: HelmetHandling) => {
    setStepData({
      ...stepData,
      helmetHandling: value,
      helmetTokenCount: value === "LOCKERS" ? (helmetTokenCount ?? 10) : undefined,
    });
  };

  const setTokenCount = (raw: string) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || raw.trim() === "") {
      setStepData({ ...stepData, helmetTokenCount: undefined });
      return;
    }
    const clamped = Math.max(1, Math.min(MAX_HELMET_LOCKERS, parsed));
    setStepData({ ...stepData, helmetTokenCount: clamped });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">
            ¿Qué tipos de vehículos recibe tu parqueadero?
            <RequiredMark />
          </p>
          <QuestionHelp title="Tipos de vehículo">
            Selecciona todos los tipos de vehículos que ingresan a tu parqueadero. Esto determinará
            el perfil operacional y las vistas dinámicas del sistema.
          </QuestionHelp>
        </div>
        {stepErrors.vehicleTypes && (
          <p className="text-xs text-danger" role="alert">
            {stepErrors.vehicleTypes}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {VEHICLE_OPTIONS.map((item) => (
            <Checkbox
              key={item.code}
              isSelected={vehicleTypes.includes(item.code)}
              onChange={(checked: boolean) => {
                const prev = vehicleTypes;
                const next = checked ? [...prev, item.code] : prev.filter((v) => v !== item.code);
                const profile = inferOperationalProfile(next);
                const updated: Record<string, unknown> = {
                  ...stepData,
                  vehicleTypes: next,
                  operationalProfile: profile,
                };
                if (!next.includes("MOTORCYCLE")) {
                  updated.helmetHandling = undefined;
                  updated.helmetTokenCount = undefined;
                }
                setStepData(updated);
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
              <span className="text-sm font-bold text-primary">
                {profileLabel(detectedProfile)}
              </span>
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

      {hasMotorcycles && (
        <div className="space-y-4 border-t border-default-200 pt-5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              ¿Cómo gestionas la custodia de cascos?
              <RequiredMark />
            </p>
            <QuestionHelp title="Custodia de cascos">
              <strong>Lockers numerados:</strong> el sistema controla automáticamente la disponibilidad
              y ocupación de lockers numerados. Al ingresar se asigna un locker y se imprime en el ticket.
              <br />
              <strong>Custodia manual:</strong> el parqueadero administra los cascos sin control de
              lockers en el sistema. Solo se registra la recepción del casco.
              <br />
              <strong>No custodio cascos:</strong> no recibes ni custodias cascos.
            </QuestionHelp>
          </div>
          {stepErrors.helmetHandling && (
            <p className="text-xs text-danger" role="alert">
              {stepErrors.helmetHandling}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {HELMET_OPTIONS.map((option) => {
              const selected = helmetHandling === option.code;
              return (
                <Button
                  key={option.code}
                  variant={selected ? "solid" : "outline"}
                  color={selected ? "primary" : "default"}
                  onPress={() => setHelmetHandling(option.code)}
                  className="w-full h-auto py-3 px-4 flex flex-col items-start text-left"
                  aria-pressed={selected}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs opacity-80">{option.description}</span>
                </Button>
              );
            })}
          </div>

          {helmetHandling === "LOCKERS" && (
            <div className="p-4 bg-default-50 dark:bg-zinc-900 border border-default-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-sm font-medium text-default-900">
                    ¿Cuántos lockers tiene el parqueadero?
                  </label>
                  <p className="text-xs text-default-500 mt-0.5">
                    Elige la cantidad real de lockers de tu parqueadero.
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={MAX_HELMET_LOCKERS}
                  className="w-28"
                  variant="bordered"
                  aria-label="Cantidad de lockers"
                  isRequired={helmetHandling === "LOCKERS"}
                  isInvalid={Boolean(stepErrors.helmetTokenCount)}
                  errorMessage={stepErrors.helmetTokenCount}
                  value={helmetTokenCount === undefined ? "" : String(helmetTokenCount)}
                  onChange={(e) => setTokenCount(e.target.value)}
                />
              </div>
              <p className="text-xs text-success-600 bg-success-50 px-3 py-2 rounded-lg">
                Se crearán automáticamente los lockers L-001, L-002, etc. al finalizar la configuración.
              </p>
            </div>
          )}

          {helmetHandling === undefined && (
            <div className="p-3 rounded-lg bg-warning-50 border border-warning-200">
              <p className="text-xs text-warning-600">
                Debes seleccionar una opción de custodia de cascos para continuar.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
