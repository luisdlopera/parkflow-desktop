import { Input } from "@/components/bridge/Input";
import { Switch } from "@/components/bridge/Switch";
import { Select } from "@/components/bridge/Select";
import { RadioGroup, Radio, Card, ListBox, FieldError, TimeField } from "@heroui/react";
import QuestionHelp from "../QuestionHelp";
import { memo, useEffect } from "react";
import { useOnboardingData, useOnboardingMetadata, VEHICLE_OPTIONS } from "../OnboardingContext";
import { Check, Moon, Zap, RefreshCcw } from "lucide-react";
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className={`cursor-pointer transition-all border ${isBasicSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-transparent hover:border-primary'}`} role="button" tabIndex={0} onClick={() => applyPreset("BASIC")} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyPreset("BASIC"); } }}>
            <Card.Content className="p-3 text-center flex flex-col items-center gap-2 relative">
              {isBasicSelected && <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />}
              <Zap className={`w-5 h-5 ${isBasicSelected ? 'text-primary' : 'text-warning'}`} />
              <p className="text-sm font-semibold">Básico</p>
              <p className="text-xs text-default-500">Solo cobro por hora. Simple y directo.</p>
            </Card.Content>
          </Card>
          <Card className={`cursor-pointer transition-all border ${isCommercialSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-transparent hover:border-primary'}`} role="button" tabIndex={0} onClick={() => applyPreset("COMMERCIAL")} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyPreset("COMMERCIAL"); } }}>
            <Card.Content className="p-3 text-center flex flex-col items-center gap-2 relative">
              {isCommercialSelected && <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />}
              <RefreshCcw className={`w-5 h-5 ${isCommercialSelected ? 'text-primary' : 'text-success'}`} />
              <p className="text-sm font-semibold">Comercial</p>
              <p className="text-xs text-default-500">Cobro por hora, con fracciones y tiempo de cortesía.</p>
            </Card.Content>
          </Card>
          {/* M-01: Moon icon was always text-primary regardless of selected state */}
          <Card className={`cursor-pointer transition-all border ${is24HSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-transparent hover:border-primary'}`} role="button" tabIndex={0} onClick={() => applyPreset("24H")} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applyPreset("24H"); } }}>
            <Card.Content className="p-3 text-center flex flex-col items-center gap-2 relative">
              {is24HSelected && <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />}
              <Moon className={`w-5 h-5 ${is24HSelected ? 'text-primary' : 'text-default-400'}`} />
              <p className="text-sm font-semibold">24 Horas</p>
              <p className="text-xs text-default-500">Incluye tarifa nocturna y cobro por día completo.</p>
            </Card.Content>
          </Card>
        </div>
      </div>

      {/* 1. Modelo Tarifario */}
      <div className="space-y-4 p-4 bg-default-50 dark:bg-zinc-900/50 rounded-xl border border-default-200">
        <p className="text-sm font-semibold text-primary">1. Modelo de Cobro Principal <RequiredMark/></p>
        <RadioGroup
          orientation="horizontal"
          value={billingModel}
          onChange={(val) => setStepData((prev) => ({
            ...prev,
            billingModel: val,
            // C-04: selecting FRACTION auto-enables fractions rule section
            ...(val === "FRACTION" ? { hasFractions: true } : {})
          }))}
          isInvalid={Boolean(stepErrors.billingModel)}
          aria-label="Modelo de cobro principal"
        >
          <Radio value="HOURLY">Por hora</Radio>
          <Radio value="FRACTION">Fracción</Radio>
          <Radio value="FLAT">Tarifa Única</Radio>
          <Radio value="FULL_DAY">Día Completo</Radio>
          <Radio value="MIXED">Mixto</Radio>
          {stepErrors.billingModel && <FieldError>{stepErrors.billingModel}</FieldError>}
        </RadioGroup>

        {showBaseRate && (
          <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg mt-4">
            <span className="text-sm font-medium">
              {baseRateLabel} <RequiredMark />
            </span>
            <Input
              type="number"
              min={1}
              className="w-40"
              label="Valor"
              isRequired
              isInvalid={Boolean(stepErrors.baseValue)}
              errorMessage={stepErrors.baseValue}
              value={stepData.baseValue !== undefined ? String(stepData.baseValue) : ""}
              onChange={(v) => setStepData((prev) => ({ ...prev, baseValue: parseNumber(v.target.value) }))}
            />
          </div>
        )}

        {/* C-01: FLAT model now shows its rate input (previously only FULL_DAY did) */}
        {showFlatRate && (
          <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg mt-4">
            <span className="text-sm font-medium">
              {flatRateLabel} <RequiredMark />
            </span>
            <Input
              type="number"
              min={1}
              className="w-40"
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
            <p className="text-sm font-semibold border-b border-default-200 pb-2">Tarifas Especiales</p>

            <div className="space-y-3">
              {/* Tarifa Nocturna */}
              <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
                <div className="flex items-center justify-between">
                  {/* I-01: Set default times in store when enabling, not just as display fallback */}
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
                    <span className="text-sm font-medium">¿Maneja tarifa nocturna?</span>
                  </Switch>
                </div>
                {hasNightRate && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-default-100 items-end">
                    <TimeField
                      label="Hora inicio"
                      // @ts-expect-error type version mismatch between HeroUI and app
                      value={parseTimeString(stepData.nightStartTime ?? "20:00")}
                      onChange={(v) => v && setStepData((prev) => ({ ...prev, nightStartTime: formatTime(v) }))}
                    />
                    <TimeField
                      label="Hora fin"
                      // @ts-expect-error type version mismatch between HeroUI and app
                      value={parseTimeString(stepData.nightEndTime ?? "06:00")}
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
                <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Switch
                      isSelected={hasFullDayRate}
                      onChange={(v) => setStepData((prev) => ({ ...prev, hasFullDayRate: v }))}
                      aria-label="Activar tarifa de día completo"
                    >
                      <span className="text-sm font-medium">¿Maneja tarifa de día completo (24h)?</span>
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
              <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <Switch
                    isSelected={hasWeekendRate}
                    onChange={(v) => setStepData((prev) => ({ ...prev, hasWeekendRate: v }))}
                    aria-label="Activar tarifa de fin de semana"
                  >
                    <span className="text-sm font-medium">¿Tarifa diferente en fines de semana/festivos?</span>
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
            <p className="text-sm font-semibold border-b border-default-200 pb-2">Reglas de Cobro</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Fracciones */}
              <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg space-y-3">
                <Switch
                  isSelected={hasFractions}
                  onChange={(v) => setStepData((prev) => ({ ...prev, hasFractions: v }))}
                  aria-label="Activar cobro por fracciones"
                >
                  <span className="text-sm font-medium">¿Cobra fracciones?</span>
                </Switch>
                {hasFractions && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      label="Minutos mínimos"
                      className="flex-1"
                      isInvalid={Boolean(stepErrors.minFractionMinutes)}
                      errorMessage={stepErrors.minFractionMinutes}
                      value={stepData.minFractionMinutes !== undefined ? String(stepData.minFractionMinutes) : ""}
                      onChange={(v) => setStepData((prev) => ({ ...prev, minFractionMinutes: parseNumber(v.target.value) }))}
                    />
                    <Input
                      type="number"
                      min={0}
                      label="Valor fracción"
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
              <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg space-y-3">
                <Switch
                  isSelected={hasCourtesy}
                  onChange={(v) => setStepData((prev) => ({ ...prev, hasCourtesy: v }))}
                  aria-label="Activar minutos de cortesía"
                >
                  <span className="text-sm font-medium">¿Minutos de cortesía (Gratis)?</span>
                </Switch>
                {hasCourtesy && (
                  <Input
                    type="number"
                    min={0}
                    label="Minutos de cortesía"
                    isInvalid={Boolean(stepErrors.graceMinutes)}
                    errorMessage={stepErrors.graceMinutes}
                    value={stepData.graceMinutes !== undefined ? String(stepData.graceMinutes) : ""}
                    onChange={(v) => setStepData((prev) => ({ ...prev, graceMinutes: parseNumber(v.target.value) }))}
                  />
                )}
              </div>
            </div>

            {/* Redondeo */}
            <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">¿Cómo desea redondear el tiempo?</span>
              <Select
                className="w-48"
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
            <p className="text-sm font-semibold border-b border-default-200 pb-2">Tarifas por Vehículo</p>
            <div className="p-3 bg-white dark:bg-zinc-900 border border-default-200 rounded-lg">
              <Switch
                isSelected={enableRateByType}
                onChange={(v) => setStepData((prev) => ({ ...prev, enableRateByType: v }))}
                aria-label="Activar tarifas por tipo de vehículo"
              >
                <span className="text-sm font-medium">¿Desea manejar tarifas diferentes por tipo de vehículo?</span>
              </Switch>

              {enableRateByType && vehicleTypes.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {vehicleTypes.map((typeCode) => {
                      const vehicle = VEHICLE_OPTIONS.find(v => v.code === typeCode);
                      // I-08: use Number() + || 0 to avoid "" from parseNumber being falsy-but-not-nullish
                      const rate = getRatesByType()[typeCode] ?? (Number(stepData.baseValue) || 0);
                      return (
                        <div key={typeCode} className="flex items-center justify-between p-2 bg-default-50 dark:bg-zinc-800/50 rounded-lg">
                          <span className="text-sm font-medium">{vehicle?.label || typeCode}</span>
                          <Input
                            type="number"
                            min={0}
                            className="w-32"
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

              {/* U-08: explain to user why no inputs appear */}
              {enableRateByType && vehicleTypes.length === 0 && (
                <p className="mt-3 text-sm text-default-500">
                  Configura los tipos de vehículo en el Paso 1 para habilitar tarifas individuales.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default Step3Rates;
