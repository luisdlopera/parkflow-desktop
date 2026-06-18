"use client";
import { useEffect, useState } from "react";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { saveRate, type RateRow } from "@/lib/settings-api";
import type { RateCategory } from "@/lib/settings-api";
import type { RateType } from "@/modules/parking/types";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import {
  RATE_TYPES, RATE_TYPE_LABELS, RATE_CATEGORIES, RATE_CATEGORY_LABELS,
  DAYS_OF_WEEK, ROUNDING, toHhMmSs, toIsoOrNull, toDatetimeLocalValue,
} from "@/features/configuration/constants";

export function RateForm({
  auditReason,
  initial,
  onCancel,
  onSaved,
  onError,
}: {
  auditReason: string;
  initial: RateRow | (Partial<RateRow> & { name: string });
  onCancel: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [vehicleTypes, setVehicleTypes] = useState<{ code: string; name: string }[]>([]);
  useEffect(() => {
    import("@/lib/settings-api").then((api) => api.fetchMasterVehicleTypes().then(setVehicleTypes).catch(() => {}));
  }, []);

  const isEdit = Boolean((initial as RateRow).id);
  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState<RateCategory>((initial as RateRow).category ?? "STANDARD");
  const [vehicleType, setVehicleType] = useState<string>(initial.vehicleType ?? "");
  const [rateType, setRateType] = useState<RateType>(initial.rateType ?? "HOURLY");
  const [amount, setAmount] = useState(String(initial.amount ?? 0));
  const [grace, setGrace] = useState(String(initial.graceMinutes ?? 0));
  const [tolerance, setTolerance] = useState(String(initial.toleranceMinutes ?? 0));
  const [fraction, setFraction] = useState(String(initial.fractionMinutes ?? 60));
  const [rounding, setRounding] = useState(initial.roundingMode ?? "UP");
  const [lost, setLost] = useState(String(initial.lostTicketSurcharge ?? 0));
  const [active, setActive] = useState(initial.active ?? true);
  const [site, setSite] = useState(initial.site ?? "DEFAULT");
  const [minSession, setMinSession] = useState(String((initial as RateRow).minSessionValue ?? ""));
  const [maxSession, setMaxSession] = useState(String((initial as RateRow).maxSessionValue ?? ""));
  const [maxDaily, setMaxDaily] = useState(String((initial as RateRow).maxDailyValue ?? ""));
  const [nightPct, setNightPct] = useState(String((initial as RateRow).nightSurchargePercent ?? 0));
  const [holidayPct, setHolidayPct] = useState(String((initial as RateRow).holidaySurchargePercent ?? 0));
  const [appliesNight, setAppliesNight] = useState((initial as RateRow).appliesNight ?? false);
  const [appliesHoliday, setAppliesHoliday] = useState((initial as RateRow).appliesHoliday ?? false);
  const initBitmap = (initial as RateRow).appliesDaysBitmap ?? null;
  const [daysBitmap, setDaysBitmap] = useState<number | null>(initBitmap);
  const [wStart, setWStart] = useState(initial.windowStart ? initial.windowStart.slice(0, 5) : "");
  const [wEnd, setWEnd] = useState(initial.windowEnd ? initial.windowEnd.slice(0, 5) : "");
  const [schedFrom, setSchedFrom] = useState(toDatetimeLocalValue((initial as RateRow).scheduledActiveFrom));
  const [schedTo, setSchedTo] = useState(toDatetimeLocalValue((initial as RateRow).scheduledActiveTo));

  const toggleDay = (bit: number) => {
    const current = daysBitmap ?? 0;
    const newVal = current ^ (1 << bit);
    setDaysBitmap(newVal === 0 || newVal === 127 ? null : newVal);
  };
  const isDayActive = (bit: number) => daysBitmap === null ? true : Boolean(daysBitmap & (1 << bit));

  return (
    <div className="surface rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-900">{isEdit ? "Editar tarifa" : "Nueva tarifa"}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input label="Nombre" size="sm" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Sede" size="sm" value={site} onChange={(e) => setSite(e.target.value)} />
        <Select label="Categoría" value={[category]} onChange={(keys) => setCategory(Array.from(keys)[0] as RateCategory)}>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover><ListBox>{RATE_CATEGORIES.map((c) => <ListBox.Item key={c} textValue={RATE_CATEGORY_LABELS[c]}>{RATE_CATEGORY_LABELS[c]}</ListBox.Item>)}</ListBox></Select.Popover>
        </Select>
        <Select label="Tipo vehículo" description="Vacío = todos" value={[vehicleType]} onChange={(keys) => setVehicleType(Array.from(keys)[0] as string)}>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {[<ListBox.Item key="" textValue="(Todos)">(Todos)</ListBox.Item>, ...vehicleTypes.map((v: any) => <ListBox.Item key={v.code} textValue={v.name}>{v.name} ({v.code})</ListBox.Item>)]}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select label="Tipo tarifa" value={[rateType]} onChange={(keys) => setRateType(Array.from(keys)[0] as RateType)}>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover><ListBox>{RATE_TYPES.map((v: any) => <ListBox.Item key={v} textValue={RATE_TYPE_LABELS[v] ?? v}>{RATE_TYPE_LABELS[v] ?? v}</ListBox.Item>)}</ListBox></Select.Popover>
        </Select>
        <Input label="Valor" size="sm" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-600">Minutos gracia / tolerancia / fraccion</p>
          <div className="flex gap-2">
            <Input aria-label="Gracia" size="sm" type="number" min="0" placeholder="Gracia" value={grace} onChange={(e) => setGrace(e.target.value)} />
            <Input aria-label="Tolerancia" size="sm" type="number" min="0" placeholder="Tolerancia" value={tolerance} onChange={(e) => setTolerance(e.target.value)} />
            <Input aria-label="Fracción" size="sm" type="number" min="1" placeholder="Fracción" value={fraction} onChange={(e) => setFraction(e.target.value)} />
          </div>
        </div>
        <Select label="Redondeo" value={[rounding]} onChange={(keys) => setRounding(Array.from(keys)[0] as "UP" | "DOWN" | "NEAREST")}>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover><ListBox>{ROUNDING.map((v: any) => <ListBox.Item key={v} textValue={v}>{v}</ListBox.Item>)}</ListBox></Select.Popover>
        </Select>
        <Input label="Recargo ticket perdido" size="sm" type="number" step="0.01" min="0" value={lost} onChange={(e) => setLost(e.target.value)} />
        <Checkbox isSelected={active} onChange={setActive}>Activa</Checkbox>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Franja (opcional) HH:MM</span>
          <div className="flex gap-3">
            <Input aria-label="Inicio de jornada" size="sm" placeholder="08:00" value={wStart} onChange={(e) => setWStart(e.target.value)} />
            <Input aria-label="Fin de jornada" size="sm" placeholder="18:00" value={wEnd} onChange={(e) => setWEnd(e.target.value)} />
          </div>
        </div>
        <div className="md:col-span-2 flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Días de la semana (vacío = todos)</span>
          <div className="flex gap-2 flex-wrap">
            {DAYS_OF_WEEK.map(({ label, bit }) => (
              <button key={bit} type="button" onClick={() => toggleDay(bit)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${isDayActive(bit) ? "bg-primary text-white border-primary" : "bg-transparent text-slate-600 border-slate-300 hover:border-primary dark:text-slate-400 dark:border-slate-600 dark:hover:border-primary"}`}>
                {label}
              </button>
            ))}
            {daysBitmap !== null && (
              <button type="button" onClick={() => setDaysBitmap(null)} className="px-3 py-1 rounded-lg text-xs font-semibold border border-slate-300 text-slate-500 hover:border-rose-400 hover:text-rose-500 dark:border-slate-600 dark:text-slate-400 dark:hover:border-rose-400 dark:hover:text-rose-400 transition-colors">
                Todos
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topes de sesión (opcional)</span>
          <div className="flex gap-2">
            <Input aria-label="Tope mínimo" size="sm" type="number" step="0.01" min="0" placeholder="Mínimo" value={minSession} onChange={(e) => setMinSession(e.target.value)} />
            <Input aria-label="Tope máximo" size="sm" type="number" step="0.01" min="0" placeholder="Máximo" value={maxSession} onChange={(e) => setMaxSession(e.target.value)} />
          </div>
        </div>
        <Input label="Máximo diario (opcional)" size="sm" type="number" step="0.01" min="0" value={maxDaily} onChange={(e) => setMaxDaily(e.target.value)} />
        <div className="flex flex-col gap-2">
          <Checkbox isSelected={appliesNight} onChange={setAppliesNight}>Aplica horario nocturno</Checkbox>
          {appliesNight && <Input label="Recargo nocturno (%)" size="sm" type="number" step="0.01" min="0" max="100" value={nightPct} onChange={(e) => setNightPct(e.target.value)} />}
        </div>
        <div className="flex flex-col gap-2">
          <Checkbox isSelected={appliesHoliday} onChange={setAppliesHoliday}>Aplica festivos</Checkbox>
          {appliesHoliday && <Input label="Recargo festivo (%)" size="sm" type="number" step="0.01" min="0" max="100" value={holidayPct} onChange={(e) => setHolidayPct(e.target.value)} />}
        </div>
        <div className="md:col-span-2 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vigencia programada (opcional, local)</span>
          <div className="flex flex-wrap gap-3">
            <Input type="datetime-local" aria-label="Vigencia desde" size="sm" value={schedFrom} onChange={(e) => setSchedFrom(e.target.value)} className="min-w-[200px] flex-1" />
            <Input type="datetime-local" aria-label="Vigencia hasta" size="sm" value={schedTo} onChange={(e) => setSchedTo(e.target.value)} className="min-w-[200px] flex-1" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" color="primary" className="font-semibold" onPress={onCancel}>Cancelar</Button>
        <Button color="primary" className="font-semibold"
          onPress={() => void (async () => {
            try {
              const sFrom = toIsoOrNull(schedFrom);
              const sTo = toIsoOrNull(schedTo);
              if ((sFrom == null) !== (sTo == null)) { onError("Vigencia programada: complete inicio y fin, o deje ambos vacíos"); return; }
              await saveRate({
                id: (initial as RateRow).id || undefined,
                name: name.trim(), site: site.trim(), vehicleType: vehicleType || null, category, rateType,
                amount: Number(amount), graceMinutes: Number(grace), toleranceMinutes: Number(tolerance), fractionMinutes: Number(fraction),
                roundingMode: rounding, lostTicketSurcharge: Number(lost), active,
                minSessionValue: minSession ? Number(minSession) : null, maxSessionValue: maxSession ? Number(maxSession) : null, maxDailyValue: maxDaily ? Number(maxDaily) : null,
                appliesNight, nightSurchargePercent: Number(nightPct) || 0, appliesHoliday, holidaySurchargePercent: Number(holidayPct) || 0,
                appliesDaysBitmap: daysBitmap, windowStart: toHhMmSs(wStart), windowEnd: toHhMmSs(wEnd),
                scheduledActiveFrom: sFrom, scheduledActiveTo: sTo,
              }, (initial as RateRow).id || undefined, auditReason);
              await onSaved();
            } catch (e) {
              onError(getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA));
            }
          })()}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
