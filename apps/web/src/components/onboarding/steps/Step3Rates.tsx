import { Input } from "@/components/bridge/Input";
import { Switch } from "@/components/bridge/Switch";
import { Select } from "@/components/bridge/Select";
import { TimeInput } from "@/components/bridge/TimeInput";
import { RadioGroup, Radio, Card, ListBox, FieldError, Tabs } from "@heroui/react";
import QuestionHelp from "../QuestionHelp";
import { memo, useEffect } from "react";
import { useOnboardingData, useOnboardingMetadata, VEHICLE_OPTIONS } from "../OnboardingContext";
import { Check, Moon, Zap, RefreshCcw, SlidersHorizontal, AlertCircle, CheckCircle2 } from "lucide-react";
import { Time } from "@internationalized/date";

function RequiredMark() {
  return <span className="text-danger ml-0.5" aria-hidden="true">*</span>;
}

const parseTimeString = (timeStr?: string | unknown) => {
  if (typeof timeStr !== "string") return new Time(0, 0);
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return new Time(0, 0);
  return new Time(hours, minutes);
};

const formatTime = (time: any) => {
  return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
};

const parseNumber = (val: string): number | "" => {
  if (val === "") return "";
  const num = Number(val);
  return isNaN(num) ? "" : Math.max(0, num);
};

const Step3Rates = memo(function Step3Rates() {
  const { stepData, setStepData, stepErrors, getRatesByType } = useOnboardingData();
  const { vehicleTypes } = useOnboardingMetadata();

  const billingModel = String(stepData.billingModel || "");
  const hasNightRate = Boolean(stepData.hasNightRate);
  const hasFullDayRate = Boolean(stepData.hasFullDayRate);
  const hasFractions = Boolean(stepData.hasFractions);
  const hasCourtesy = Boolean(stepData.hasCourtesy);
  const enableRateByType = Boolean(stepData.enableRateByType);
  const hasWeekendRate = Boolean(stepData.hasWeekendRate);
  const rounding = String(stepData.rounding || "EXACT");

  // All relevant toggles must match for a preset to show as selected (C-QW-02, M-05)
  const isBasicSelected = billingModel === "HOURLY" && !hasFractions && !hasNightRate && !hasFullDayRate && !hasWeekendRate && rounding === "EXACT";
  const isCommercialSelected = billingModel === "HOURLY" && hasFractions && hasCourtesy && !hasWeekendRate && rounding === "15_MIN";
  const is24HSelected = billingModel === "MIXED" && hasNightRate && hasFullDayRate && !hasFractions && !hasWeekendRate && rounding === "EXACT";
  const isCustomSelected = !isBasicSelected && !isCommercialSelected && !is24HSelected && billingModel !== "";

  // Cleanup effect: use functional setStepData to avoid running on every keystroke (I-05 / P-01)
  useEffect(() => {
    setStepData((prev) => {
      const next = { ...prev };
      let changed = false;

      if (!hasNightRate) {
        if ('nightStartTime' in next) { delete next.nightStartTime; changed = true; }
        if ('nightEndTime' in next) { delete next.nightEndTime; changed = true; }
        if ('nightRate' in next) { delete next.nightRate; changed = true; }
      }
      if (!hasFullDayRate && billingModel !== "FULL_DAY" && billingModel !== "MIXED") {
        if ('fullDayRate' in next) { delete next.fullDayRate; changed = true; }
      }
      if (!hasFractions) {
        if ('minFractionMinutes' in next) { delete next.minFractionMinutes; changed = true; }
        if ('fractionValue' in next) { delete next.fractionValue; changed = true; }
      }
      if (!hasCourtesy) {
        if ('graceMinutes' in next) { delete next.graceMinutes; changed = true; }
      }
      if (!hasWeekendRate) {
        if ('weekendRate' in next) { delete next.weekendRate; changed = true; }
      }

      return changed ? next : prev;
    });
  }, [hasNightRate, hasFullDayRate, hasFractions, hasCourtesy, hasWeekendRate, billingModel, setStepData]);

  // Uses functional form to capture fresh state and avoid stale closures (A-03)
  const applyPreset = (preset: "BASIC" | "COMMERCIAL" | "24H") => {
    setStepData((prev) => {
      const base = { ...prev };
      delete base.nightStartTime;
      delete base.nightEndTime;
      delete base.nightRate;
      delete base.fullDayRate;
      delete base.minFractionMinutes;
      delete base.fractionValue;
      delete base.graceMinutes;
      delete base.weekendRate;  // I-03

      switch (preset) {
        case "BASIC":
          return {
            ...base,
            billingModel: "HOURLY",
            hasNightRate: false,
            hasFullDayRate: false,
            hasFractions: false,
            hasCourtesy: false,
            enableRateByType: false,
            hasWeekendRate: false,   // I-03
            ratesByType: {},         // I-04
            rounding: "EXACT",
          };
        case "COMMERCIAL": {
          const baseVal = typeof base.baseValue === "number" ? base.baseValue : Number(base.baseValue) || 0;
          return {
            ...base,
            billingModel: "HOURLY",
            hasNightRate: false,
            hasFullDayRate: false,
            hasFractions: true,
            minFractionMinutes: 15,
            fractionValue: baseVal > 0 ? Math.round(baseVal / 4) : "",  // I-02
            hasCourtesy: true,
            graceMinutes: 15,
            hasWeekendRate: false,   // I-03
            ratesByType: {},         // I-04
            rounding: "15_MIN",
          };
        }
        case "24H":
          return {
            ...base,
            billingModel: "MIXED",
            hasNightRate: true,
            nightStartTime: "20:00",
            nightEndTime: "06:00",
            hasFullDayRate: true,
            hasFractions: false,
            hasWeekendRate: false,   // I-03
            ratesByType: {},         // I-04
            rounding: "EXACT",
          };
        default:
          return base;
      }
    });
  };

  // C-01: FLAT model was missing its rate input (showFullDayAlways excluded FLAT)
  // C-04: FRACTION model was missing its rate input
  const showBaseRate = billingModel === "HOURLY" || billingModel === "MIXED" || billingModel === "FRACTION";
  const showFlatRate = billingModel === "FULL_DAY" || billingModel === "FLAT";
  const baseRateLabel = billingModel === "FRACTION" ? "Tarifa base por fracción" : "Tarifa base por hora";
  const flatRateLabel = billingModel === "FLAT" ? "Tarifa única" : "Tarifa por día completo";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Presets */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <p className="text-base font-semibold">Configuración de Tarifas Inteligente</p>
          <QuestionHelp title="Tarifas">
            Elige un modelo de cobro o utiliza una configuración recomendada. El asistente ajustará los campos a lo que realmente necesitas.
          </QuestionHelp>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
          <Card
            className={`cursor-pointer transition-all border ${isBasicSelected ? 'border-brand bg-brand/10 dark:bg-brand/10 ring-2 ring-brand/30' : 'border-default-200 dark:border-zinc-600 dark:bg-zinc-800/40 hover:border-brand dark:hover:border-brand/50 dark:hover:bg-zinc-700/50'}`}
            role="button"
            tabIndex={0}
            onClick={() => applyPreset("BASIC")}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyPreset("BASIC"); } }}
          >
            <Card.Content className="p-2 lg:p-3 text-center flex flex-col items-center gap-1 lg:gap-2">
              {isBasicSelected && <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-brand" />}
              <Zap className={`w-4 lg:w-5 h-4 lg:h-5 ${isBasicSelected ? 'text-brand' : 'text-warning'}`} />
              <p className="text-xs lg:text-sm font-semibold">Básico</p>
              <p className="text-[10px] lg:text-xs text-default-500">Solo cobro por hora</p>
            </Card.Content>
          </Card>

          <Card
            className={`cursor-pointer transition-all border ${isCommercialSelected ? 'border-brand bg-brand/10 dark:bg-brand/10 ring-2 ring-brand/30' : 'border-default-200 dark:border-zinc-600 dark:bg-zinc-800/40 hover:border-brand dark:hover:border-brand/50 dark:hover:bg-zinc-700/50'}`}
            role="button"
            tabIndex={0}
            onClick={() => applyPreset("COMMERCIAL")}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyPreset("COMMERCIAL"); } }}
          >
            <Card.Content className="p-2 lg:p-3 text-center flex flex-col items-center gap-1 lg:gap-2">
              {isCommercialSelected && <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-brand" />}
              <RefreshCcw className={`w-4 lg:w-5 h-4 lg:h-5 ${isCommercialSelected ? 'text-brand' : 'text-success'}`} />
              <p className="text-xs lg:text-sm font-semibold">Comercial</p>
              <p className="text-[10px] lg:text-xs text-default-500">Con fracciones</p>
            </Card.Content>
          </Card>

          <Card
            className={`cursor-pointer transition-all border ${is24HSelected ? 'border-brand bg-brand/10 dark:bg-brand/10 ring-2 ring-brand/30' : 'border-default-200 dark:border-zinc-600 dark:bg-zinc-800/40 hover:border-brand dark:hover:border-brand/50 dark:hover:bg-zinc-700/50'}`}
            role="button"
            tabIndex={0}
            onClick={() => applyPreset("24H")}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyPreset("24H"); } }}
          >
            <Card.Content className="p-2 lg:p-3 text-center flex flex-col items-center gap-1 lg:gap-2">
              {is24HSelected && <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-brand" />}
              <Moon className={`w-4 lg:w-5 h-4 lg:h-5 ${is24HSelected ? 'text-brand' : 'text-default-400'}`} />
              <p className="text-xs lg:text-sm font-semibold">24 Horas</p>
              <p className="text-[10px] lg:text-xs text-default-500">Tarifa nocturna</p>
            </Card.Content>
          </Card>

          <Card
            className={`cursor-default transition-all border ${isCustomSelected ? 'border-brand bg-brand/10 dark:bg-brand/10 ring-2 ring-brand/30' : 'border-default-200 dark:border-zinc-600 dark:bg-zinc-800/40'}`}
          >
            <Card.Content className="p-2 lg:p-3 text-center flex flex-col items-center gap-1 lg:gap-2">
              {isCustomSelected && <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-brand" />}
              <SlidersHorizontal className={`w-4 lg:w-5 h-4 lg:h-5 ${isCustomSelected ? 'text-brand' : 'text-default-400'}`} />
              <p className="text-xs lg:text-sm font-semibold">Personal.</p>
              <p className="text-[10px] lg:text-xs text-default-500">A tu medida</p>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* 1. Modelo Tarifario */}
      <div className="space-y-4 p-4 bg-default-50 dark:bg-zinc-800/40 dark:border-zinc-700 rounded-xl border border-default-200">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-brand">1. Modelo de Cobro Principal <RequiredMark/></p>
          <QuestionHelp title="Modelo de Cobro">
            Elige cómo se calcula el cobro: por hora completa, por fracciones de tiempo, precio fijo único, día completo, o una combinación.
          </QuestionHelp>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { val: "HOURLY", label: "Por hora", desc: "Cobro por cada hora", Icon: Zap },
            { val: "FRACTION", label: "Fracción", desc: "Periodos de tiempo", Icon: RefreshCcw },
            { val: "FLAT", label: "Tarifa Única", desc: "Precio fijo", Icon: Check },
            { val: "FULL_DAY", label: "Día Completo", desc: "Día de 24h", Icon: Moon },
            { val: "MIXED", label: "Mixto", desc: "Combinado", Icon: SlidersHorizontal },
          ].map(({ val, label, desc, Icon }) => (
            <button
              key={val}
              onClick={() => setStepData((prev) => ({
                ...prev,
                billingModel: val,
                ...(val === "FRACTION" ? { hasFractions: true } : {})
              }))}
              className={`p-2 rounded-lg border-2 transition-all text-center ${
                billingModel === val
                  ? 'border-brand bg-brand/10 dark:bg-brand/10'
                  : 'border-default-200 dark:border-zinc-600 dark:bg-zinc-800/40 hover:border-brand dark:hover:border-brand/50 dark:hover:bg-zinc-700/50'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto ${billingModel === val ? 'text-brand' : 'text-default-400'}`} />
              <p className="text-xs font-semibold leading-tight mt-1">{label}</p>
              <p className="text-[10px] text-default-500 leading-tight">{desc}</p>
            </button>
          ))}
        </div>

        {stepErrors.billingModel && (
          <div className="flex items-center gap-2 p-2 bg-danger/10 text-danger rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {stepErrors.billingModel}
          </div>
        )}

        {showBaseRate && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-default-50 dark:bg-zinc-700/50 border border-default-200 dark:border-zinc-600 rounded-lg mt-4">
            <span className="text-sm font-medium">
              {baseRateLabel} <RequiredMark />
            </span>
            <Input
              type="number"
              min={1}
              className="w-full sm:w-40"
              label="Valor"
              isRequired
              isInvalid={Boolean(stepErrors.baseValue)}
              errorMessage={stepErrors.baseValue}
              value={stepData.baseValue !== undefined ? String(stepData.baseValue) : ""}
              onChange={(v) => setStepData((prev) => ({ ...prev, baseValue: parseNumber(v.target.value) }))}
            />
          </div>
        )}

        {showFlatRate && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-default-50 dark:bg-zinc-700/50 border border-default-200 dark:border-zinc-600 rounded-lg mt-4">
            <span className="text-sm font-medium">
              {flatRateLabel} <RequiredMark />
            </span>
            <Input
              type="number"
              min={1}
              className="w-full sm:w-40"
              label="Valor"
              isRequired
              isInvalid={Boolean(stepErrors.flatRate)}
              errorMessage={stepErrors.flatRate}
              value={stepData.flatRate !== undefined ? String(stepData.flatRate) : ""}
              onChange={(v) => setStepData((prev) => ({ ...prev, flatRate: parseNumber(v.target.value) }))}
            />
          </div>
        )}
      </div>

      {billingModel && (
        <>
          {/* 2. Tarifas Especiales */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <p className="text-sm font-semibold">2. Tarifas Especiales</p>
              <span className="text-xs text-default-500">(Opcional)</span>
            </div>

            <div className="space-y-3">
              {/* Tarifa Nocturna */}
              <div className="p-3 bg-default-50 dark:bg-zinc-700/50 border border-default-200 dark:border-zinc-600 rounded-lg">
                <div className="flex items-center justify-between">
                  <Switch
                    isSelected={hasNightRate}
                    onChange={(v) => setStepData((prev) => ({
                      ...prev,
                      hasNightRate: v,
                      ...(v ? {
                        nightStartTime: prev.nightStartTime ?? "20:00",
                        nightEndTime: prev.nightEndTime ?? "06:00",
                      } : {})
                    }))}
                    aria-label="Activar tarifa nocturna"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">Tarifa nocturna</span>
                      <QuestionHelp title="Tarifa Nocturna">Cobro diferente (generalmente más alto) en horario nocturno.</QuestionHelp>
                    </div>
                  </Switch>
                </div>
                {hasNightRate && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-default-200 dark:border-zinc-600 items-end">
                    <TimeInput
                      label="Hora inicio"
                      value={parseTimeString(stepData.nightStartTime ?? "20:00") as any}
                      onChange={(v) => v && setStepData((prev) => ({ ...prev, nightStartTime: formatTime(v) }))}
                    />
                    <TimeInput
                      label="Hora fin"
                      value={parseTimeString(stepData.nightEndTime ?? "06:00") as any}
                      onChange={(v) => v && setStepData((prev) => ({ ...prev, nightEndTime: formatTime(v) }))}
                    />
                    <Input
                      type="number"
                      min={0}
                      label="Valor noche"
                      isInvalid={Boolean(stepErrors.nightRate)}
                      errorMessage={stepErrors.nightRate}
                      value={stepData.nightRate !== undefined ? String(stepData.nightRate) : ""}
                      onChange={(v) => setStepData((prev) => ({ ...prev, nightRate: parseNumber(v.target.value) }))}
                    />
                  </div>
                )}
                {stepErrors.nightStartTime && (
                  <p className="text-danger text-xs mt-2">{stepErrors.nightStartTime}</p>
                )}
              </div>

              {/* Día Completo — hidden when FULL_DAY or FLAT are already the main model */}
              {!showFlatRate && (
                <div className="p-3 bg-default-50 dark:bg-zinc-700/50 border border-default-200 dark:border-zinc-600 rounded-lg">
                  <div className="flex items-center justify-between gap-3">
                    <Switch
                      isSelected={hasFullDayRate}
                      onChange={(v) => setStepData((prev) => ({ ...prev, hasFullDayRate: v }))}
                      aria-label="Activar tarifa de día completo"
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">Día completo (24h)</span>
                        <QuestionHelp title="Día Completo">Cobro fijo para permanencias largas.</QuestionHelp>
                      </div>
                    </Switch>
                    {hasFullDayRate && (
                      <Input
                        type="number"
                        min={0}
                        className="w-32"
                        aria-label="Tarifa día completo"
                        placeholder="Valor"
                        isInvalid={Boolean(stepErrors.fullDayRate)}
                        errorMessage={stepErrors.fullDayRate}
                        value={stepData.fullDayRate !== undefined ? String(stepData.fullDayRate) : ""}
                        onChange={(v) => setStepData((prev) => ({ ...prev, fullDayRate: parseNumber(v.target.value) }))}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Fines de semana */}
              <div className="p-3 bg-default-50 dark:bg-zinc-700/50 border border-default-200 dark:border-zinc-600 rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <Switch
                    isSelected={hasWeekendRate}
                    onChange={(v) => setStepData((prev) => ({ ...prev, hasWeekendRate: v }))}
                    aria-label="Activar tarifa de fin de semana"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">Fin de semana/Festivos</span>
                      <QuestionHelp title="Fin de Semana">Precio diferente en sábado, domingo o festivos.</QuestionHelp>
                    </div>
                  </Switch>
                  {hasWeekendRate && (
                    <Input
                      type="number"
                      min={0}
                      className="w-32"
                      aria-label="Tarifa fin de semana"
                      placeholder="Valor"
                      isInvalid={Boolean(stepErrors.weekendRate)}
                      errorMessage={stepErrors.weekendRate}
                      value={stepData.weekendRate !== undefined ? String(stepData.weekendRate) : ""}
                      onChange={(v) => setStepData((prev) => ({ ...prev, weekendRate: parseNumber(v.target.value) }))}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Reglas de Cobro */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <p className="text-sm font-semibold">3. Reglas de Cobro</p>
              <span className="text-xs text-default-500">(Opcional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fracciones */}
              <div className="p-3 bg-default-50 dark:bg-zinc-700/50 border border-default-200 dark:border-zinc-600 rounded-lg space-y-3">
                <Switch
                  isSelected={hasFractions}
                  onChange={(v) => setStepData((prev) => ({ ...prev, hasFractions: v }))}
                  aria-label="Activar cobro por fracciones"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Cobro por fracciones</span>
                    <QuestionHelp title="Cobro por Fracciones">Cobrar en periodos pequeños (15 min, 30 min) en lugar de hora completa.</QuestionHelp>
                  </div>
                </Switch>
                {hasFractions && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      label="Minutos mín."
                      className="flex-1"
                      isInvalid={Boolean(stepErrors.minFractionMinutes)}
                      errorMessage={stepErrors.minFractionMinutes}
                      value={stepData.minFractionMinutes !== undefined ? String(stepData.minFractionMinutes) : ""}
                      onChange={(v) => setStepData((prev) => ({ ...prev, minFractionMinutes: parseNumber(v.target.value) }))}
                    />
                    <Input
                      type="number"
                      min={0}
                      label="Valor frac."
                      className="flex-1"
                      isInvalid={Boolean(stepErrors.fractionValue)}
                      errorMessage={stepErrors.fractionValue}
                      value={stepData.fractionValue !== undefined ? String(stepData.fractionValue) : ""}
                      onChange={(v) => setStepData((prev) => ({ ...prev, fractionValue: parseNumber(v.target.value) }))}
                    />
                  </div>
                )}
              </div>

              {/* Cortesía */}
              <div className="p-3 bg-default-50 dark:bg-zinc-700/50 border border-default-200 dark:border-zinc-600 rounded-lg space-y-3">
                <Switch
                  isSelected={hasCourtesy}
                  onChange={(v) => setStepData((prev) => ({ ...prev, hasCourtesy: v }))}
                  aria-label="Activar minutos de cortesía"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Minutos de cortesía</span>
                    <QuestionHelp title="Tiempo de Cortesía">Minutos iniciales gratis sin cobro.</QuestionHelp>
                  </div>
                </Switch>
                {hasCourtesy && (
                  <Input
                    type="number"
                    min={0}
                    label="Minutos gratis"
                    isInvalid={Boolean(stepErrors.graceMinutes)}
                    errorMessage={stepErrors.graceMinutes}
                    value={stepData.graceMinutes !== undefined ? String(stepData.graceMinutes) : ""}
                    onChange={(v) => setStepData((prev) => ({ ...prev, graceMinutes: parseNumber(v.target.value) }))}
                  />
                )}
              </div>
            </div>

            {/* Redondeo */}
            <div className="p-3 bg-default-50 dark:bg-zinc-700/50 border border-default-200 dark:border-zinc-600 rounded-lg space-y-3">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Redondeo de tiempo</span>
                <QuestionHelp title="Redondeo de Tiempo">Cobro exacto o redondeado en bloques (15 min, 30 min, etc).</QuestionHelp>
              </div>
              <Select
                className="w-full"
                aria-label="Tipo de redondeo"
                selectedKey={rounding}
                onSelectionChange={(keys: any) => {
                  const val = Array.from(keys)[0];
                  if (val) setStepData((prev) => ({ ...prev, rounding: val }));
                }}
              >
                <Select.Trigger aria-label="Tipo de redondeo"><Select.Value aria-label="Tipo de redondeo" /><Select.Indicator aria-label="Tipo de redondeo" /></Select.Trigger>
                <Select.Popover aria-label="Tipo de redondeo">
                  <ListBox>
                    <ListBox.Item key="EXACT" textValue="Exacto al minuto">Exacto al minuto</ListBox.Item>
                    <ListBox.Item key="15_MIN" textValue="Cada 15 minutos">Cada 15 minutos</ListBox.Item>
                    <ListBox.Item key="30_MIN" textValue="Cada 30 minutos">Cada 30 minutos</ListBox.Item>
                    <ListBox.Item key="1_HOUR" textValue="Cada hora">Cada hora</ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>

          {/* 4. Tarifas por Vehículo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <p className="text-sm font-semibold">4. Tarifas por Vehículo</p>
              <span className="text-xs text-default-500">(Opcional)</span>
            </div>
            <div className="p-3 bg-default-50 dark:bg-zinc-700/50 border border-default-200 dark:border-zinc-600 rounded-lg space-y-3">
              <Switch
                isSelected={enableRateByType}
                onChange={(v) => setStepData((prev) => ({ ...prev, enableRateByType: v }))}
                aria-label="Activar tarifas por tipo de vehículo"
              >
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">Tarifas distintas por tipo de vehículo</span>
                  <QuestionHelp title="Tarifas por Vehículo">Cobro diferente para Motos, Carros, Bicicletas, etc.</QuestionHelp>
                </div>
              </Switch>

              {enableRateByType && vehicleTypes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-default-200 dark:border-zinc-600">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {vehicleTypes.map((typeCode) => {
                      const vehicle = VEHICLE_OPTIONS.find(v => v.code === typeCode);
                      const rate = getRatesByType()[typeCode] ?? (Number(stepData.baseValue) || 0);
                      return (
                        <div key={typeCode} className="flex items-center justify-between p-2 bg-default-50 dark:bg-zinc-800/40 dark:border-zinc-600 rounded">
                          <span className="text-sm font-medium">{vehicle?.label || typeCode}</span>
                          <Input
                            type="number"
                            min={0}
                            className="w-28"
                            aria-label={`Tarifa ${vehicle?.label ?? typeCode}`}
                            value={rate !== undefined ? String(rate) : ""}
                            onChange={(v) => {
                              const current = getRatesByType();
                              const next = { ...current, [typeCode]: parseNumber(v.target.value) };
                              setStepData((prev) => ({ ...prev, ratesByType: next }));
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {enableRateByType && vehicleTypes.length === 0 && (
                <div className="flex items-center gap-2 p-2 bg-info/10 text-info rounded text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Configura tipos de vehículo en Paso 1 para usar esta opción.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default Step3Rates;
