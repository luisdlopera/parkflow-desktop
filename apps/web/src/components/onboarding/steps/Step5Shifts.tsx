import { Input } from "@/components/bridge/Input";
import { Switch } from "@/components/bridge/Switch";
import { TimeField } from "@heroui/react";
import { Time } from "@internationalized/date";
import { memo } from "react";
import { useOnboardingData } from "../OnboardingContext";

const parseTimeString = (timeStr?: string | unknown) => {
  if (typeof timeStr !== "string") return new Time(0, 0);
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return new Time(0, 0);
  return new Time(hours, minutes);
};

const formatTime = (time: any) => {
  if (!time) return "00:00";
  if (time.target && typeof time.target.value === "string") return time.target.value;
  if (time.hour !== undefined && time.minute !== undefined) {
    return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
  }
  return "00:00";
};

const Step5Shifts = memo(function Step5Shifts() {
  const { stepData, setStepData } = useOnboardingData();

  return (
    <div className="space-y-4">
      <Switch isSelected={Boolean(stepData.enabled)} onChange={(v) => setStepData({ ...stepData, enabled: v })} aria-label="Alternar opción">
        ¿Trabajan por turnos?
      </Switch>
      
      {Boolean(stepData.enabled) && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-default-600">Horarios de turno:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between p-2 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
              <span className="text-sm w-1/2">Turno diurno inicio</span>
              <TimeField 
                className="w-1/2"
                aria-label="Inicio turno diurno"
                // @ts-expect-error type version mismatch between HeroUI and app
                value={parseTimeString(stepData.dayShiftStart ?? "06:00")} 
                onChange={(v) => v && setStepData({ ...stepData, dayShiftStart: formatTime(v) })} 
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
              <span className="text-sm w-1/2">Turno diurno fin</span>
              <TimeField 
                className="w-1/2"
                aria-label="Fin turno diurno"
                // @ts-expect-error type version mismatch between HeroUI and app
                value={parseTimeString(stepData.dayShiftEnd ?? "18:00")} 
                onChange={(v) => v && setStepData({ ...stepData, dayShiftEnd: formatTime(v) })} 
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
              <span className="text-sm w-1/2">Turno nocturno inicio</span>
              <TimeField 
                className="w-1/2"
                aria-label="Inicio turno nocturno"
                // @ts-expect-error type version mismatch between HeroUI and app
                value={parseTimeString(stepData.nightShiftStart ?? "18:00")} 
                onChange={(v) => v && setStepData({ ...stepData, nightShiftStart: formatTime(v) })} 
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-default-50 dark:bg-default-100 dark:bg-zinc-900 border border-default-200 rounded-lg">
              <span className="text-sm w-1/2">Turno nocturno fin</span>
              <TimeField 
                className="w-1/2"
                aria-label="Fin turno nocturno"
                // @ts-expect-error type version mismatch between HeroUI and app
                value={parseTimeString(stepData.nightShiftEnd ?? "06:00")} 
                onChange={(v) => v && setStepData({ ...stepData, nightShiftEnd: formatTime(v) })} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Step5Shifts;
