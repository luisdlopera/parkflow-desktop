import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import QuestionHelp from "../QuestionHelp";
import { useOnboarding, VEHICLE_OPTIONS } from "../OnboardingContext";
import { Hash } from "lucide-react";

export default function Step2Capacity() {
  const { stepData, setStepData, vehicleTypes, getCapacityByType } = useOnboarding();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">¿Cuál es la capacidad de tu parqueadero?</p>
        <QuestionHelp title="Capacidad">
          Configura la capacidad total y por tipo de vehículo. Esto permite controlar cupos específicos.
        </QuestionHelp>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-default-400" />
            <span className="text-sm font-medium">Capacidad total</span>
          </div>
          <Input 
            type="number" 
            min="0"
            className="w-32"
            aria-label="Capacidad total"
            value={String(stepData.totalCapacity ?? "")} 
            onChange={(v) => setStepData({ ...stepData, totalCapacity: Math.max(0, Number(v.target.value) || 0) })} 
          />
        </div>
        
        <Switch isSelected={Boolean(stepData.controlSlots)} onChange={(v) => setStepData({ ...stepData, controlSlots: v })}>
          ¿Quieres controlar cupos?
        </Switch>
        
        {Boolean(stepData.controlSlots) && vehicleTypes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-default-600">Capacidad por tipo de vehículo:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {vehicleTypes.map((typeCode) => {
                const vehicle = VEHICLE_OPTIONS.find(v => v.code === typeCode);
                const capacity = getCapacityByType()[typeCode] ?? 0;
                return (
                  <div key={typeCode} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
                    <span className="text-sm">{vehicle?.label}</span>
                    <Input 
                      type="number" 
                      min="0"
                      className="w-24"
                      aria-label={`Capacidad ${vehicle?.label ?? typeCode}`}
                      value={String(capacity)} 
                      onChange={(v) => {
                        const current = getCapacityByType();
                        const next = { ...current, [typeCode]: Math.max(0, Number(v.target.value) || 0) };
                        setStepData({ ...stepData, capacityByType: next });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
