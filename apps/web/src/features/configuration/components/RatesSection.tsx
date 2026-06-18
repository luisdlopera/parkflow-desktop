"use client";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { useDialog } from "@/components/ui/DialogProvider";
import DataTable from "@/components/ui/DataTable";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchRates,
  fetchRateById,
  saveRate,
  deleteRate,
  patchRateStatus,
  type RateRow
} from "@/lib/settings-api";
import type { RateCategory } from "@/lib/settings-api";
import type { RateType } from "@/modules/parking/types";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import {
  RATE_TYPES,
  RATE_TYPE_LABELS,
  RATE_CATEGORIES,
  RATE_CATEGORY_LABELS,
  DAYS_OF_WEEK,
  ROUNDING,
  toHhMmSs,
  toIsoOrNull,
  toDatetimeLocalValue
} from "@/features/configuration/constants";

function RateForm({
  auditReason,
  initial,
  onCancel,
  onSaved,
  onError
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
  const toggleDay = (bit: number) => {
    const current = daysBitmap ?? 0;
    const newVal = current ^ (1 << bit);
    setDaysBitmap(newVal === 0 || newVal === 127 ? null : newVal);
  };
  const isDayActive = (bit: number) => daysBitmap === null ? true : Boolean(daysBitmap & (1 << bit));
  const [wStart, setWStart] = useState(initial.windowStart ? initial.windowStart.slice(0, 5) : "");
  const [wEnd, setWEnd] = useState(initial.windowEnd ? initial.windowEnd.slice(0, 5) : "");
  const [schedFrom, setSchedFrom] = useState(toDatetimeLocalValue((initial as RateRow).scheduledActiveFrom));
  const [schedTo, setSchedTo] = useState(toDatetimeLocalValue((initial as RateRow).scheduledActiveTo));

  return (
    <div className="surface rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-900">{isEdit ? "Editar tarifa" : "Nueva tarifa"}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Input label="Nombre" size="sm" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Sede" size="sm" value={site} onChange={(e) => setSite(e.target.value)} />
        <Select label="Categoría" value={[category]} onChange={(keys) => setCategory(Array.from(keys)[0] as RateCategory)}>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {RATE_CATEGORIES.map((c) => (
                <ListBox.Item key={c} textValue={RATE_CATEGORY_LABELS[c]}>{RATE_CATEGORY_LABELS[c]}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select label="Tipo vehículo" description="Vacío = todos" value={[vehicleType]} onChange={(keys) => setVehicleType(Array.from(keys)[0] as string)}>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {[
                <ListBox.Item key="" textValue="(Todos)">(Todos)</ListBox.Item>,
                ...vehicleTypes.map((v: any) => (
                  <ListBox.Item key={v.code} textValue={v.name}>{v.name} ({v.code})</ListBox.Item>
                ))
              ]}
            </ListBox>
          </Select.Popover>
        </Select>
        <Select label="Tipo tarifa" value={[rateType]} onChange={(keys) => setRateType(Array.from(keys)[0] as RateType)}>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {RATE_TYPES.map((v: any) => (
                <ListBox.Item key={v} textValue={RATE_TYPE_LABELS[v] ?? v}>{RATE_TYPE_LABELS[v] ?? v}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Input label="Valor" size="sm" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-600">Minutos gracia / tolerancia / fraccion</p>
          <div className="flex gap-2">
            <Input aria-label="Minutos de gracia" size="sm" type="number" min="0" placeholder="Gracia" value={grace} onChange={(e) => setGrace(e.target.value)} />
            <Input aria-label="Minutos de tolerancia" size="sm" type="number" min="0" placeholder="Tolerancia" value={tolerance} onChange={(e) => setTolerance(e.target.value)} />
            <Input aria-label="Fracción de facturación" size="sm" type="number" min="1" placeholder="Fracción" value={fraction} onChange={(e) => setFraction(e.target.value)} />
          </div>
        </div>
        <Select label="Redondeo" value={[rounding]} onChange={(keys) => setRounding(Array.from(keys)[0] as "UP" | "DOWN" | "NEAREST")}>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              {ROUNDING.map((v: any) => (
                <ListBox.Item key={v} textValue={v}>{v}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
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
              <button
                key={bit}
                type="button"
                onClick={() => toggleDay(bit)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  isDayActive(bit)
                    ? "bg-primary text-white border-primary"
                    : "bg-transparent text-slate-600 border-slate-300 hover:border-primary dark:text-slate-400 dark:border-slate-600 dark:hover:border-primary"
                }`}
              >
                {label}
              </button>
            ))}
            {daysBitmap !== null && (
              <button
                type="button"
                onClick={() => setDaysBitmap(null)}
                className="px-3 py-1 rounded-lg text-xs font-semibold border border-slate-300 text-slate-500 hover:border-rose-400 hover:text-rose-500 dark:border-slate-600 dark:text-slate-400 dark:hover:border-rose-400 dark:hover:text-rose-400 transition-colors"
              >
                Todos
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topes de sesión (opcional)</span>
          <div className="flex gap-2">
            <Input aria-label="Tope mínimo de sesión" size="sm" type="number" step="0.01" min="0" placeholder="Mínimo" value={minSession} onChange={(e) => setMinSession(e.target.value)} />
            <Input aria-label="Tope máximo de sesión" size="sm" type="number" step="0.01" min="0" placeholder="Máximo" value={maxSession} onChange={(e) => setMaxSession(e.target.value)} />
          </div>
        </div>
        <Input label="Máximo diario (opcional)" size="sm" type="number" step="0.01" min="0" value={maxDaily} onChange={(e) => setMaxDaily(e.target.value)} />
        <div className="flex flex-col gap-2">
          <Checkbox isSelected={appliesNight} onChange={setAppliesNight}>Aplica horario nocturno</Checkbox>
          {appliesNight && (
            <Input label="Recargo nocturno (%)" size="sm" type="number" step="0.01" min="0" max="100" value={nightPct} onChange={(e) => setNightPct(e.target.value)} />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Checkbox isSelected={appliesHoliday} onChange={setAppliesHoliday}>Aplica festivos</Checkbox>
          {appliesHoliday && (
            <Input label="Recargo festivo (%)" size="sm" type="number" step="0.01" min="0" max="100" value={holidayPct} onChange={(e) => setHolidayPct(e.target.value)} />
          )}
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
        <Button
          color="primary"
          className="font-semibold"
          onPress={() =>
            void (async () => {
              try {
                const sFrom = toIsoOrNull(schedFrom);
                const sTo = toIsoOrNull(schedTo);
                if ((sFrom == null) !== (sTo == null)) {
                  onError("Vigencia programada: complete inicio y fin, o deje ambos vacios");
                  return;
                }
                await saveRate(
                  {
                    id: (initial as RateRow).id || undefined,
                    name: name.trim(),
                    site: site.trim(),
                    vehicleType: vehicleType || null,
                    category,
                    rateType,
                    amount: Number(amount),
                    graceMinutes: Number(grace),
                    toleranceMinutes: Number(tolerance),
                    fractionMinutes: Number(fraction),
                    roundingMode: rounding,
                    lostTicketSurcharge: Number(lost),
                    active,
                    minSessionValue: minSession ? Number(minSession) : null,
                    maxSessionValue: maxSession ? Number(maxSession) : null,
                    maxDailyValue: maxDaily ? Number(maxDaily) : null,
                    appliesNight,
                    nightSurchargePercent: Number(nightPct) || 0,
                    appliesHoliday,
                    holidaySurchargePercent: Number(holidayPct) || 0,
                    appliesDaysBitmap: daysBitmap,
                    windowStart: toHhMmSs(wStart),
                    windowEnd: toHhMmSs(wEnd),
                    scheduledActiveFrom: sFrom,
                    scheduledActiveTo: sTo
                  },
                  (initial as RateRow).id || undefined,
                  auditReason
                );
                await onSaved();
              } catch (e) {
                onError(getUserFriendlyErrorMessage(e, FrontendActionError.SAVE_DATA));
              }
            })()
          }
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}

export default function RatesSection({
  canEdit,
  onNotify,
  auditReason
}: {
  canEdit: boolean;
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
  auditReason: string;
}) {
  const [rows, setRows] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [site, setSite] = useState("DEFAULT");
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [editing, setEditing] = useState<RateRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [rateDetail, setRateDetail] = useState<RateRow | null>(null);
  const [rateDetailLoading, setRateDetailLoading] = useState(false);
  const { confirm } = useDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchRates({ site, q: q || undefined, active: activeFilter, page, size: 15 });
      setRows(res.content);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [site, q, activeFilter, page]);

  useEffect(() => { load().catch(console.error); }, [load]);

  const formState = useMemo(() => {
    const base = editing ?? {
      id: "",
      name: "",
      vehicleType: null as any,
      rateType: "HOURLY" as RateType,
      amount: 0,
      graceMinutes: 0,
      toleranceMinutes: 0,
      fractionMinutes: 60,
      roundingMode: "UP" as const,
      lostTicketSurcharge: 0,
      active: true,
      site: "DEFAULT",
      windowStart: null as string | null,
      windowEnd: null as string | null,
      scheduledActiveFrom: null as string | null,
      scheduledActiveTo: null as string | null,
      createdAt: "",
      updatedAt: ""
    };
    return base;
  }, [editing]);

  const rateColumns = useMemo<DataTableColumn<RateRow>[]>(
    () => [
      { key: "name", label: "Nombre" },
      { key: "rateType", label: "Tipo", render: (r) => <span>{r.rateType} / {r.vehicleType ?? "Cualquiera"}</span> },
      { key: "amount", label: "Valor", render: (r) => Number(r.amount).toFixed(2) },
      { key: "active", label: "Activa", render: (r) => (r.active ? "Si" : "No") },
      { key: "site", label: "Sede", render: (r) => r.site },
      {
        key: "id",
        label: "",
        render: (r) =>
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                color="primary"
                className="font-semibold"
                onPress={() =>
                  void (async () => {
                    setRateDetailLoading(true);
                    setRateDetail(null);
                    try {
                      setRateDetail(await fetchRateById(r.id));
                    } catch (e) {
                      onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.LOAD_DATA) });
                    } finally {
                      setRateDetailLoading(false);
                    }
                  })()
                }
              >
                Detalle
              </Button>
              <Button size="sm" variant="tertiary" color="primary" className="font-semibold" onPress={() => { setCreating(false); setEditing(r); }}>
                Editar
              </Button>
              <Button
                size="sm"
                variant="tertiary"
                color="primary"
                className="font-semibold"
                onPress={() =>
                  void (async () => {
                    try {
                      await patchRateStatus(r.id, !r.active, auditReason);
                      onNotify({ kind: "ok", text: r.active ? "Tarifa desactivada." : "Tarifa activada." });
                      await load();
                    } catch (e) {
                      onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.CHANGE_STATUS) });
                    }
                  })()
                }
              >
                {r.active ? "Desactivar" : "Activar"}
              </Button>
              <Button
                size="sm"
                variant="tertiary"
                color="danger"
                className="font-semibold"
                onPress={async () => {
                  if (!(await confirm("Eliminar tarifa? Solo permitido si no hay sesiones asociadas."))) return;
                  try {
                    await deleteRate(r.id, auditReason);
                    onNotify({ kind: "ok", text: "Tarifa eliminada." });
                    await load();
                  } catch (e) {
                    onNotify({ kind: "err", text: getUserFriendlyErrorMessage(e, FrontendActionError.DELETE_DATA) });
                  }
                }}
              >
                Eliminar
              </Button>
            </div>
          ) : (
            ""
          )
      }
    ],
    [canEdit, auditReason, load, confirm, onNotify]
  );

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Input label="Sede" size="sm" value={site} onChange={(e) => setSite(e.target.value)} />
          <Input label="Buscar" placeholder="Nombre..." size="sm" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select
            label="Estado"
            className="max-w-[120px]"
            value={activeFilter === null ? [""] : [String(activeFilter)]}
            onChange={(keys) => {
              const v = Array.from(keys)[0] as string;
              setActiveFilter(v === "" ? null : v === "true");
            }}
          >
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item key="" textValue="Todos">Todos</ListBox.Item>
                <ListBox.Item key="true" textValue="Activas">Activas</ListBox.Item>
                <ListBox.Item key="false" textValue="Inactivas">Inactivas</ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
          <Select
            label="Categoría"
            className="max-w-[140px]"
            value={[categoryFilter]}
            onChange={(keys) => setCategoryFilter(Array.from(keys)[0] as string)}
          >
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                {[
                  <ListBox.Item key="" textValue="Todas">Todas</ListBox.Item>,
                  ...RATE_CATEGORIES.map((c) => (
                    <ListBox.Item key={c} textValue={RATE_CATEGORY_LABELS[c]}>{RATE_CATEGORY_LABELS[c]}</ListBox.Item>
                  ))
                ]}
              </ListBox>
            </Select.Popover>
          </Select>
          <Button variant="outline" color="primary" size="md" className="font-semibold" onPress={() => { load().catch(console.error); }} isLoading={loading}>
            Actualizar
          </Button>
          {canEdit ? (
            <Button color="primary" size="md" className="font-semibold" onPress={() => { setEditing(null); setCreating(true); }}>
              Nueva tarifa
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Cargando...</p> : null}
      {!loading && rows.length === 0 && !error ? (
        <p className="text-sm text-slate-600">No hay tarifas para los filtros actuales.</p>
      ) : null}

      {rateDetailLoading ? <p className="text-sm text-slate-500">Cargando detalle...</p> : null}
      {rateDetail ? (
        <div className="surface rounded-2xl p-4 text-sm text-slate-800 space-y-1">
          <div className="flex justify-between gap-2">
            <h3 className="font-semibold text-slate-900">Detalle tarifa</h3>
            <Button size="sm" variant="ghost" color="primary" className="font-semibold" onPress={() => setRateDetail(null)}>Cerrar</Button>
          </div>
          <p><span className="text-slate-500">Nombre:</span> {rateDetail.name}</p>
          <p>
            <span className="text-slate-500">Sede:</span> {rateDetail.site} ·{" "}
            <span className="text-slate-500">Estado:</span> {rateDetail.active ? "Activa" : "Inactiva"}
          </p>
          <p>
            <span className="text-slate-500">Tipo / vehiculo:</span> {rateDetail.rateType} /{" "}
            {rateDetail.vehicleType ?? "Cualquiera"}
          </p>
          <p>
            <span className="text-slate-500">Valor:</span> {Number(rateDetail.amount).toFixed(2)} ·{" "}
            <span className="text-slate-500">Fraccion:</span> {rateDetail.fractionMinutes} min ·{" "}
            <span className="text-slate-500">Redondeo:</span> {rateDetail.roundingMode}
          </p>
          <p>
            <span className="text-slate-500">Gracia / tolerancia:</span> {rateDetail.graceMinutes} /{" "}
            {rateDetail.toleranceMinutes} min
          </p>
          <p>
            <span className="text-slate-500">Franja:</span>{" "}
            {rateDetail.windowStart && rateDetail.windowEnd
              ? `${rateDetail.windowStart.slice(0, 5)} – ${rateDetail.windowEnd.slice(0, 5)}`
              : "24h"}
          </p>
          <p>
            <span className="text-slate-500">Vigencia programada:</span>{" "}
            {rateDetail.scheduledActiveFrom || rateDetail.scheduledActiveTo
              ? `${rateDetail.scheduledActiveFrom ?? "—"} → ${rateDetail.scheduledActiveTo ?? "—"}`
              : "Sin programar"}
          </p>
          <p className="text-xs text-slate-500">Creada {rateDetail.createdAt} · Actualizada {rateDetail.updatedAt}</p>
        </div>
      ) : null}

      <DataTable<RateRow> columns={rateColumns} rows={rows} />

      <div className="flex items-center gap-4">
        <Button size="sm" variant="tertiary" color="primary" isDisabled={page <= 0} onPress={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
        <span className="text-sm font-medium text-slate-600">Pagina {page + 1} de {Math.max(1, totalPages)}</span>
        <Button size="sm" variant="tertiary" color="primary" isDisabled={page + 1 >= totalPages} onPress={() => setPage((p) => p + 1)}>Siguiente</Button>
      </div>

      {(creating || editing) && canEdit ? (
        <RateForm
          key={editing ? editing.id : "create"}
          auditReason={auditReason}
          initial={formState}
          onCancel={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => { setCreating(false); setEditing(null); onNotify({ kind: "ok", text: "Tarifa guardada." }); await load(); }}
          onError={(msg) => onNotify({ kind: "err", text: msg })}
        />
      ) : null}
    </div>
  );
}
