"use client";

import Button from "@/components/ui/Button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Pagination } from "@heroui/pagination";
import { Switch } from "@heroui/switch";
import { Chip } from "@heroui/chip";
import { Tabs, Tab } from "@heroui/tabs";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Textarea } from "@heroui/input";
import DataTable from "@/components/ui/DataTable";
import {
  createUser,
  deleteRate,
  fetchParameters,
  fetchRateById,
  fetchRates,
  fetchUserById,
  fetchUsers,
  patchRateStatus,
  patchUser,
  patchUserStatus,
  putParameters,
  resetParameters,
  resetUserPassword,
  saveRate,
  validateParameters,
  type ParkingParametersPayload,
  type RateRow,
  type UserAdminRow
} from "@/lib/settings-api";
import { hasPermission } from "@/lib/auth";
import type { Permission } from "@parkflow/types";
import type { RateType } from "@/modules/parking/types";
import type { UserRole } from "@/modules/users/types";
import type { VehicleType } from "@/modules/parking/types";
import { useCallback, useEffect, useMemo, useState } from "react";

type TabKey = "rates" | "users" | "parameters" | "interface" | "masters";

const VEHICLE_TYPES: VehicleType[] = ["CAR", "MOTORCYCLE", "TRUCK", "VAN", "OTHER"];
const RATE_TYPES: RateType[] = ["HOURLY", "DAILY", "FLAT"];
const ROUNDING: Array<"UP" | "DOWN" | "NEAREST"> = ["UP", "DOWN", "NEAREST"];
const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "CAJERO", "OPERADOR", "AUDITOR"];

function toHhMmSs(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const p = t.split(":");
  if (p.length === 2) {
    return `${p[0].padStart(2, "0")}:${p[1].padStart(2, "0")}:00`;
  }
  return t.length === 5 ? `${t}:00` : t;
}

function toIsoOrNull(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const LOST_TICKET_POLICIES = [
  { value: "SURCHARGE_RATE", label: "Recargo por tarifa (lostTicketSurcharge)" },
  { value: "BLOCK_EXIT", label: "Bloquear salida sin supervisor" },
  { value: "SUPERVISOR_ONLY", label: "Solo supervisor puede cerrar" }
] as const;

function Notice({
  kind,
  text
}: {
  kind: "ok" | "err" | "info";
  text: string;
}) {
  const cls =
    kind === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : kind === "err"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-slate-200 bg-slate-50 text-slate-800";
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${cls}`} role="status">
      {text}
    </div>
  );
}

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<TabKey>("rates");
  const [notice, setNotice] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [auditReason, setAuditReason] = useState("");
  const [perm, setPerm] = useState<Record<string, boolean>>({});

  // ConfiguraciÃ³n de interfaz (persistida en localStorage)
  const [uiSettings, setUiSettings] = useState({
    showSystemStatus: true,
    showKeyboardShortcuts: true
  });

  useEffect(() => {
    const saved = localStorage.getItem("parkflow_ui_settings");
    if (saved) {
      try {
        setUiSettings(JSON.parse(saved));
      } catch {
        localStorage.removeItem("parkflow_ui_settings");
      }
    }
  }, []);

  const updateUiSetting = (key: keyof typeof uiSettings, value: boolean) => {
    const updated = { ...uiSettings, [key]: value };
    setUiSettings(updated);
    localStorage.setItem("parkflow_ui_settings", JSON.stringify(updated));
  };

  const refreshPerms = useCallback(async () => {
    const checks: Permission[] = [
      "tarifas:leer",
      "tarifas:editar",
      "usuarios:leer",
      "usuarios:editar",
      "configuracion:leer",
      "configuracion:editar"
    ];
    const entries = await Promise.all(checks.map(async (p) => [p, await hasPermission(p)] as const));
    setPerm(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    void refreshPerms();
  }, [refreshPerms]);

  const can = useMemo(
    () => ({
      ratesRead: perm["tarifas:leer"] ?? false,
      ratesEdit: perm["tarifas:editar"] ?? false,
      usersRead: perm["usuarios:leer"] ?? false,
      usersEdit: perm["usuarios:editar"] ?? false,
      cfgRead: perm["configuracion:leer"] ?? false,
      cfgEdit: perm["configuracion:editar"] ?? false
    }),
    [perm]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Configuracion</p>
        <h1 className="text-3xl font-semibold text-slate-900">Tarifas, usuarios y parametros</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Administracion operativa del parqueadero. Los cambios sensibles quedan auditados en el servidor.
        </p>
      </div>

      {notice ? <Notice kind={notice.kind} text={notice.text} /> : null}

      <Notice
        kind="info"
        text="Politica offline-first: la edicion de tarifas, usuarios y parametros debe hacerse en linea; el cliente offline prioriza operacion de caja y sincronizacion (no encola cambios administrativos)."
      />

      <Textarea
        label="Motivo de auditorÃ­a"
        description="Opcional, hasta 500 caracteres. Se envÃ­a al servidor en cambios sensibles."
        maxLength={500}
        value={auditReason}
        onChange={(e) => setAuditReason(e.target.value)}
        placeholder="Ej. Ajuste acordado con administraciÃ³n..."
        variant="flat"
        className="max-w-2xl"
      />

      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => setTab(key as TabKey)}
        aria-label="ConfiguraciÃ³n"
        color="warning"
        variant="underlined"
        classNames={{
          tab: "px-4 py-2",
          tabList: "gap-2"
        }}
      >
        <Tab
          key="rates"
          title={
            <div className="flex items-center gap-2">
              <span>Tarifas</span>
              {!can.ratesRead && <Chip size="sm" color="danger" variant="flat">Sin permiso</Chip>}
            </div>
          }
          isDisabled={!can.ratesRead}
        />
        <Tab
          key="users"
          title={
            <div className="flex items-center gap-2">
              <span>Usuarios</span>
              {!can.usersRead && <Chip size="sm" color="danger" variant="flat">Sin permiso</Chip>}
            </div>
          }
          isDisabled={!can.usersRead}
        />
        <Tab
          key="parameters"
          title={
            <div className="flex items-center gap-2">
              <span>ParÃ¡metros</span>
              {!can.cfgRead && <Chip size="sm" color="danger" variant="flat">Sin permiso</Chip>}
            </div>
          }
          isDisabled={!can.cfgRead}
        />
        <Tab
          key="interface"
          title={
            <div className="flex items-center gap-2">
              <span>Interfaz</span>
            </div>
          }
        />
        <Tab
          key="masters"
          title={
            <div className="flex items-center gap-2">
              <span>Maestros</span>
            </div>
          }
        />
      </Tabs>

      {tab === "rates" && can.ratesRead ? (
        <RatesSection canEdit={can.ratesEdit} onNotify={setNotice} auditReason={auditReason} />
      ) : null}
      {tab === "rates" && !can.ratesRead ? (
        <p className="text-sm text-slate-600">No tiene permiso para ver tarifas.</p>
      ) : null}

      {tab === "users" && can.usersRead ? (
        <UsersSection canEdit={can.usersEdit} onNotify={setNotice} auditReason={auditReason} />
      ) : null}
      {tab === "users" && !can.usersRead ? (
        <p className="text-sm text-slate-600">No tiene permiso para ver usuarios.</p>
      ) : null}

      {tab === "parameters" && can.cfgRead ? (
        <ParametersSection canEdit={can.cfgEdit} onNotify={setNotice} auditReason={auditReason} />
      ) : null}
      {tab === "parameters" && !can.cfgRead ? (
        <p className="text-sm text-slate-600">No tiene permiso para ver parametros.</p>
      ) : null}

      {tab === "interface" && (
        <InterfaceSection
          settings={uiSettings}
          onUpdate={updateUiSetting}
        />
      )}

      {tab === "masters" && (
        <MastersSection onNotify={setNotice} />
      )}
    </div>
  );
}

function InterfaceSection({
  settings,
  onUpdate
}: {
  settings: { showSystemStatus: boolean; showKeyboardShortcuts: boolean };
  onUpdate: (key: "showSystemStatus" | "showKeyboardShortcuts", value: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">PersonalizaciÃ³n del Sidebar</h2>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Mostrar estado del sistema</p>
              <p className="text-sm text-slate-500">
                Muestra el indicador "Sistema operativo" en el sidebar con el punto verde de estado.
              </p>
            </div>
            <Switch
              isSelected={settings.showSystemStatus}
              onValueChange={(checked) => onUpdate("showSystemStatus", checked)}
              size="lg"
              color="warning"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Mostrar atajos de teclado</p>
              <p className="text-sm text-slate-500">
                Muestra la secciÃ³n de atajos de teclado (F1, F2, F3, F4, Esc) en la parte inferior del sidebar.
              </p>
            </div>
            <Switch
              isSelected={settings.showKeyboardShortcuts}
              onValueChange={(checked) => onUpdate("showKeyboardShortcuts", checked)}
              size="lg"
              color="warning"
            />
          </div>
        </CardBody>
      </Card>

      <Card className="bg-amber-50/50 border-amber-200">
        <CardBody>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-amber-800">ConfiguraciÃ³n local</p>
              <p className="text-sm text-amber-700">
                Estas preferencias se guardan solo en tu navegador y no afectan a otros usuarios.
                Se aplican inmediatamente sin necesidad de recargar la pÃ¡gina.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function RatesSection({
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
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [editing, setEditing] = useState<RateRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [rateDetail, setRateDetail] = useState<RateRow | null>(null);
  const [rateDetailLoading, setRateDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchRates({ site, q: q || undefined, active: activeFilter, page, size: 15 });
      setRows(res.content);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando tarifas");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [site, q, activeFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const formState = useMemo(() => {
    const base = editing ?? {
      id: "",
      name: "",
      vehicleType: null as VehicleType | null,
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

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs font-semibold text-slate-600">
            Sede
            <input
              className="mt-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={site}
              onChange={(e) => setSite(e.target.value)}
            />
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-600">
            Buscar
            <input
              className="mt-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre..."
            />
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-600">
            Estado
            <select
              className="mt-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              value={activeFilter === null ? "" : String(activeFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setActiveFilter(v === "" ? null : v === "true");
              }}
            >
              <option value="">Todos</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </label>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
            onClick={() => void load()}
            disabled={loading}
          >
            Actualizar
          </button>
          {canEdit ? (
            <button
              type="button"
              className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
              onClick={() => {
                setEditing(null);
                setCreating(true);
              }}
            >
              Nueva tarifa
            </button>
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
            <button
              type="button"
              className="text-xs font-semibold text-slate-600"
              onClick={() => setRateDetail(null)}
            >
              Cerrar
            </button>
          </div>
          <p>
            <span className="text-slate-500">Nombre:</span> {rateDetail.name}
          </p>
          <p>
            <span className="text-slate-500">Sede:</span> {rateDetail.site} Â·{" "}
            <span className="text-slate-500">Estado:</span> {rateDetail.active ? "Activa" : "Inactiva"}
          </p>
          <p>
            <span className="text-slate-500">Tipo / vehiculo:</span> {rateDetail.rateType} /{" "}
            {rateDetail.vehicleType ?? "Cualquiera"}
          </p>
          <p>
            <span className="text-slate-500">Valor:</span> {Number(rateDetail.amount).toFixed(2)} Â·{" "}
            <span className="text-slate-500">Fraccion:</span> {rateDetail.fractionMinutes} min Â·{" "}
            <span className="text-slate-500">Redondeo:</span> {rateDetail.roundingMode}
          </p>
          <p>
            <span className="text-slate-500">Gracia / tolerancia:</span> {rateDetail.graceMinutes} /{" "}
            {rateDetail.toleranceMinutes} min
          </p>
          <p>
            <span className="text-slate-500">Franja:</span>{" "}
            {rateDetail.windowStart && rateDetail.windowEnd
              ? `${rateDetail.windowStart.slice(0, 5)} â€“ ${rateDetail.windowEnd.slice(0, 5)}`
              : "24h"}
          </p>
          <p>
            <span className="text-slate-500">Vigencia programada:</span>{" "}
            {rateDetail.scheduledActiveFrom || rateDetail.scheduledActiveTo
              ? `${rateDetail.scheduledActiveFrom ?? "â€”"} â†’ ${rateDetail.scheduledActiveTo ?? "â€”"}`
              : "Sin programar"}
          </p>
          <p className="text-xs text-slate-500">
            Creada {rateDetail.createdAt} Â· Actualizada {rateDetail.updatedAt}
          </p>
        </div>
      ) : null}

      <DataTable<RateRow>
        columns={[
          { key: "name", label: "Nombre" },
          {
            key: "rateType",
            label: "Tipo",
            render: (r) => (
              <span>
                {r.rateType} / {r.vehicleType ?? "Cualquiera"}
              </span>
            )
          },
          {
            key: "amount",
            label: "Valor",
            render: (r) => Number(r.amount).toFixed(2)
          },
          {
            key: "active",
            label: "Activa",
            render: (r) => (r.active ? "Si" : "No")
          },
          {
            key: "site",
            label: "Sede",
            render: (r) => r.site
          },
          {
            key: "id",
            label: "",
            render: (r) =>
              canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-700"
                    onClick={() =>
                      void (async () => {
                        setRateDetailLoading(true);
                        setRateDetail(null);
                        try {
                          setRateDetail(await fetchRateById(r.id));
                        } catch (e) {
                          onNotify({
                            kind: "err",
                            text: e instanceof Error ? e.message : "No se pudo cargar el detalle"
                          });
                        } finally {
                          setRateDetailLoading(false);
                        }
                      })()
                    }
                  >
                    Detalle
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-amber-800"
                    onClick={() => {
                      setCreating(false);
                      setEditing(r);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-600"
                    onClick={() =>
                      void (async () => {
                        try {
                          await patchRateStatus(r.id, !r.active, auditReason);
                          onNotify({
                            kind: "ok",
                            text: r.active ? "Tarifa desactivada." : "Tarifa activada."
                          });
                          await load();
                        } catch (e) {
                          onNotify({
                            kind: "err",
                            text: e instanceof Error ? e.message : "No se pudo cambiar estado"
                          });
                        }
                      })()
                    }
                  >
                    {r.active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-700"
                    onClick={() => {
                      if (!confirm("Eliminar tarifa? Solo permitido si no hay sesiones asociadas.")) {
                        return;
                      }
                      void (async () => {
                        try {
                          await deleteRate(r.id, auditReason);
                          onNotify({ kind: "ok", text: "Tarifa eliminada." });
                          await load();
                        } catch (e) {
                          onNotify({
                            kind: "err",
                            text: e instanceof Error ? e.message : "No se pudo eliminar"
                          });
                        }
                      })();
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                ""
              )
          }
        ]}
        rows={rows}
      />

      <div className="flex gap-2 text-xs text-slate-600">
        <button
          type="button"
          disabled={page <= 0}
          className="rounded border px-2 py-1 disabled:opacity-40"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Anterior
        </button>
        <span>
          Pagina {page + 1} / {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          disabled={page + 1 >= totalPages}
          className="rounded border px-2 py-1 disabled:opacity-40"
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </button>
      </div>

      {(creating || editing) && canEdit ? (
        <RateForm
          key={editing ? editing.id : "create"}
          auditReason={auditReason}
          initial={formState}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            onNotify({ kind: "ok", text: "Tarifa guardada." });
            await load();
          }}
          onError={(msg) => onNotify({ kind: "err", text: msg })}
        />
      ) : null}
    </div>
  );
}

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
  const [vehicleTypes, setVehicleTypes] = useState<{code: string; name: string}[]>([]);
  useEffect(() => {
    import("@/lib/settings-api").then(api => api.fetchMasterVehicleTypes().then(setVehicleTypes).catch(() => {}));
  }, []);
  const isEdit = Boolean((initial as RateRow).id);
  const [name, setName] = useState(initial.name);
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
  const [wStart, setWStart] = useState(
    initial.windowStart ? initial.windowStart.slice(0, 5) : ""
  );
  const [wEnd, setWEnd] = useState(initial.windowEnd ? initial.windowEnd.slice(0, 5) : "");
  const [schedFrom, setSchedFrom] = useState(
    toDatetimeLocalValue((initial as RateRow).scheduledActiveFrom)
  );
  const [schedTo, setSchedTo] = useState(
    toDatetimeLocalValue((initial as RateRow).scheduledActiveTo)
  );

  return (
    <div className="surface rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        {isEdit ? "Editar tarifa" : "Nueva tarifa"}
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">
          Nombre
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Sede
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={site}
            onChange={(e) => setSite(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Tipo vehiculo (vacÃ­o = todos)
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
          >
            <option value="">(Todos)</option>
            {vehicleTypes.map((v) => (
              <option key={v.code} value={v.code}>
                {v.name} ({v.code})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Tipo tarifa
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={rateType}
            onChange={(e) => setRateType(e.target.value as RateType)}
          >
            {RATE_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Valor
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Minutos gracia / tolerancia / fraccion
          <div className="mt-1 flex gap-2">
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              type="number"
              min="0"
              value={grace}
              onChange={(e) => setGrace(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              type="number"
              min="0"
              value={tolerance}
              onChange={(e) => setTolerance(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              type="number"
              min="1"
              value={fraction}
              onChange={(e) => setFraction(e.target.value)}
            />
          </div>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Redondeo
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            value={rounding}
            onChange={(e) => setRounding(e.target.value as "UP" | "DOWN" | "NEAREST")}
          >
            {ROUNDING.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Recargo ticket perdido
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            type="number"
            step="0.01"
            min="0"
            value={lost}
            onChange={(e) => setLost(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Activa
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Franja (opcional) HH:MM
          <div className="mt-1 flex gap-2">
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              placeholder="08:00"
              value={wStart}
              onChange={(e) => setWStart(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              placeholder="18:00"
              value={wEnd}
              onChange={(e) => setWEnd(e.target.value)}
            />
          </div>
        </label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2">
          Vigencia programada (opcional, local). Deje ambas vacias si no aplica.
          <div className="mt-1 flex flex-wrap gap-2">
            <input
              type="datetime-local"
              className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm"
              value={schedFrom}
              onChange={(e) => setSchedFrom(e.target.value)}
            />
            <input
              type="datetime-local"
              className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm"
              value={schedTo}
              onChange={(e) => setSchedTo(e.target.value)}
            />
          </div>
        </label>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="min-w-[140px]">
          <Button
            label="Guardar"
            onClick={() =>
              void (async () => {
                try {
                  const sFrom = toIsoOrNull(schedFrom);
                  const sTo = toIsoOrNull(schedTo);
                  if ((sFrom == null) !== (sTo == null)) {
                    onError("Vigencia programada: complete inicio y fin, o deje ambos vacios");
                    return;
                  }
                  const payload: Record<string, unknown> = {
                    name: name.trim(),
                    vehicleType: vehicleType ? (vehicleType as VehicleType) : null,
                    rateType,
                    amount: Number(amount),
                    graceMinutes: Number(grace),
                    toleranceMinutes: Number(tolerance),
                    fractionMinutes: Number(fraction),
                    roundingMode: rounding,
                    lostTicketSurcharge: Number(lost),
                    active,
                    site: site.trim(),
                    windowStart: toHhMmSs(wStart),
                    windowEnd: toHhMmSs(wEnd),
                    scheduledActiveFrom: sFrom,
                    scheduledActiveTo: sTo
                  };
                  if (!payload.name) {
                    onError("Nombre obligatorio");
                    return;
                  }
                  await saveRate(payload, isEdit ? (initial as RateRow).id : undefined, auditReason);
                  await onSaved();
                } catch (e) {
                  onError(e instanceof Error ? e.message : "Error al guardar");
                }
              })()
            }
          />
        </div>
        <div className="min-w-[140px]">
          <Button label="Cancelar" tone="ghost" onClick={onCancel} />
        </div>
      </div>
    </div>
  );
}

function UsersSection({
  canEdit,
  onNotify,
  auditReason
}: {
  canEdit: boolean;
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
  auditReason: string;
}) {
  const [rows, setRows] = useState<UserAdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [editing, setEditing] = useState<UserAdminRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [userDetail, setUserDetail] = useState<UserAdminRow | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchUsers({
        q: q || undefined,
        active: activeFilter,
        page,
        size: 15
      });
      setRows(res.content);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando usuarios");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, activeFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs font-semibold text-slate-600">
          Buscar
          <input
            className="mt-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre o correo..."
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-slate-600">
          Estado
          <select
            className="mt-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            value={activeFilter === null ? "" : String(activeFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setActiveFilter(v === "" ? null : v === "true");
            }}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </label>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
          onClick={() => void load()}
          disabled={loading}
        >
          Actualizar
        </button>
        {canEdit ? (
          <button
            type="button"
            className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
            onClick={() => setShowCreate(true)}
          >
            Nuevo usuario
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Cargando...</p> : null}

      {userDetailLoading ? <p className="text-sm text-slate-500">Cargando detalle...</p> : null}
      {userDetail ? (
        <div className="surface rounded-2xl p-4 text-sm text-slate-800 space-y-1">
          <div className="flex justify-between gap-2">
            <h3 className="font-semibold text-slate-900">Detalle usuario</h3>
            <button
              type="button"
              className="text-xs font-semibold text-slate-600"
              onClick={() => setUserDetail(null)}
            >
              Cerrar
            </button>
          </div>
          <p>
            <span className="text-slate-500">Nombre:</span> {userDetail.name}
          </p>
          <p>
            <span className="text-slate-500">Correo:</span> {userDetail.email}
          </p>
          <p>
            <span className="text-slate-500">Rol:</span> {userDetail.role} Â·{" "}
            <span className="text-slate-500">Estado:</span> {userDetail.active ? "Activo" : "Inactivo"}
          </p>
          <p>
            <span className="text-slate-500">Documento:</span> {userDetail.document ?? "â€”"} Â·{" "}
            <span className="text-slate-500">Telefono:</span> {userDetail.phone ?? "â€”"}
          </p>
          <p>
            <span className="text-slate-500">Sede / terminal:</span> {userDetail.site ?? "â€”"} /{" "}
            {userDetail.terminal ?? "â€”"}
          </p>
          <p>
            <span className="text-slate-500">Ultimo acceso:</span>{" "}
            {userDetail.lastAccessAt ? userDetail.lastAccessAt : "â€”"}
          </p>
          <p className="text-xs text-slate-500">
            Creado {userDetail.createdAt} Â· Actualizado {userDetail.updatedAt}
          </p>
        </div>
      ) : null}

      <DataTable<UserAdminRow>
        columns={[
          { key: "name", label: "Nombre" },
          { key: "email", label: "Correo" },
          { key: "role", label: "Rol" },
          {
            key: "active",
            label: "Activo",
            render: (r) => (r.active ? "Si" : "No")
          },
          {
            key: "id",
            label: "",
            render: (r) => {
              const u = r;
              return (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-700"
                    onClick={() =>
                      void (async () => {
                        setUserDetailLoading(true);
                        setUserDetail(null);
                        try {
                          setUserDetail(await fetchUserById(u.id));
                        } catch (e) {
                          onNotify({
                            kind: "err",
                            text: e instanceof Error ? e.message : "No se pudo cargar el detalle"
                          });
                        } finally {
                          setUserDetailLoading(false);
                        }
                      })()
                    }
                  >
                    Detalle
                  </button>
                  {canEdit ? (
                    <>
                      <button
                        type="button"
                        className="text-xs font-semibold text-amber-800"
                        onClick={() => setEditing(u)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-slate-600"
                        onClick={() =>
                          void (async () => {
                            try {
                              await patchUserStatus(u.id, !u.active, auditReason);
                              onNotify({ kind: "ok", text: "Estado actualizado." });
                              await load();
                            } catch (e) {
                              onNotify({
                                kind: "err",
                                text: e instanceof Error ? e.message : "Error"
                              });
                            }
                          })()
                        }
                      >
                        {u.active ? "Inactivar" : "Activar"}
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-slate-600"
                        onClick={() => {
                          const p = window.prompt("Nueva contrasena (min 8 caracteres)");
                          if (!p || p.length < 8) {
                            return;
                          }
                          void (async () => {
                            try {
                              await resetUserPassword(u.id, p, auditReason);
                              onNotify({ kind: "ok", text: "Contrasena restablecida." });
                            } catch (e) {
                              onNotify({
                                kind: "err",
                                text: e instanceof Error ? e.message : "Error"
                              });
                            }
                          })();
                        }}
                      >
                        Reset clave
                      </button>
                    </>
                  ) : null}
                </div>
              );
            }
          }
        ]}
        rows={rows}
      />

      <div className="flex gap-2 text-xs text-slate-600">
        <button
          type="button"
          disabled={page <= 0}
          className="rounded border px-2 py-1 disabled:opacity-40"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Anterior
        </button>
        <span>
          Pagina {page + 1} / {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          disabled={page + 1 >= totalPages}
          className="rounded border px-2 py-1 disabled:opacity-40"
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </button>
      </div>

      {showCreate && canEdit ? (
        <UserCreatePanel
          auditReason={auditReason}
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            onNotify({ kind: "ok", text: "Usuario creado." });
            await load();
          }}
          onError={(m) => onNotify({ kind: "err", text: m })}
        />
      ) : null}

      {editing && canEdit ? (
        <UserEditPanel
          auditReason={auditReason}
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            onNotify({ kind: "ok", text: "Usuario actualizado." });
            await load();
          }}
          onError={(m) => onNotify({ kind: "err", text: m })}
        />
      ) : null}
    </div>
  );
}

function UserCreatePanel({
  auditReason,
  onClose,
  onCreated,
  onError
}: {
  auditReason: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("CAJERO");
  const [password, setPassword] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [site, setSite] = useState("");
  const [terminal, setTerminal] = useState("");

  return (
    <div className="surface rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-900">Nuevo usuario</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Contrasena inicial (min 8)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Documento (opcional)"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Telefono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Sede"
          value={site}
          onChange={(e) => setSite(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Terminal / caja"
          value={terminal}
          onChange={(e) => setTerminal(e.target.value)}
        />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="min-w-[120px]">
          <Button
            label="Crear"
            onClick={() =>
              void (async () => {
                try {
                  if (!name.trim()) {
                    onError("Nombre obligatorio");
                    return;
                  }
                  if (!email.trim()) {
                    onError("Correo obligatorio");
                    return;
                  }
                  if (password.length < 8) {
                    onError("Contrasena muy corta");
                    return;
                  }
                  await createUser(
                    {
                      name: name.trim(),
                      email: email.trim(),
                      role,
                      initialPassword: password,
                      document: document.trim() || undefined,
                      phone: phone.trim() || undefined,
                      site: site.trim() || undefined,
                      terminal: terminal.trim() || undefined
                    },
                    auditReason
                  );
                  await onCreated();
                } catch (e) {
                  onError(e instanceof Error ? e.message : "Error");
                }
              })()
            }
          />
        </div>
        <div className="min-w-[120px]">
          <Button label="Cerrar" tone="ghost" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

function UserEditPanel({
  auditReason,
  user,
  onClose,
  onSaved,
  onError
}: {
  auditReason: string;
  user: UserAdminRow;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [document, setDocument] = useState(user.document ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [site, setSite] = useState(user.site ?? "");
  const [terminal, setTerminal] = useState(user.terminal ?? "");

  return (
    <div className="surface rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-900">Editar usuario</h2>
      <p className="text-xs text-slate-500">{user.email}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Documento"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Telefono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Sede"
          value={site}
          onChange={(e) => setSite(e.target.value)}
        />
        <input
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          placeholder="Terminal"
          value={terminal}
          onChange={(e) => setTerminal(e.target.value)}
        />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="min-w-[120px]">
          <Button
            label="Guardar"
            onClick={() =>
              void (async () => {
                try {
                  if (!name.trim() || !email.trim()) {
                    onError("Nombre y correo son obligatorios");
                    return;
                  }
                  await patchUser(
                    user.id,
                    {
                      name: name.trim(),
                      email: email.trim(),
                      role,
                      document: document.trim() || null,
                      phone: phone.trim() || null,
                      site: site.trim() || null,
                      terminal: terminal.trim() || null
                    },
                    auditReason
                  );
                  await onSaved();
                } catch (e) {
                  onError(e instanceof Error ? e.message : "Error");
                }
              })()
            }
          />
        </div>
        <div className="min-w-[120px]">
          <Button label="Cerrar" tone="ghost" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

function ParametersSection({
  canEdit,
  onNotify,
  auditReason
}: {
  canEdit: boolean;
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
  auditReason: string;
}) {
  const [paramSite, setParamSite] = useState("DEFAULT");
  const [data, setData] = useState<ParkingParametersPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchParameters(paramSite.trim() || "DEFAULT"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [paramSite]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return <p className="text-sm text-slate-500">Cargando parametros...</p>;
  }
  if (error && !data) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-slate-600">Sin datos.</p>;
  }

  const setField = (k: keyof ParkingParametersPayload, v: string | number | boolean) => {
    setData((d) => ({ ...(d ?? {}), [k]: v }));
  };

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Parametros del parqueadero</h2>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-4">
          <label className="flex flex-col text-xs font-semibold text-slate-600">
            Codigo de sede (persistencia)
            <input
              className="mt-1 rounded-lg border border-slate-200 px-2 py-2 text-sm"
              value={paramSite}
              onChange={(e) => setParamSite(e.target.value)}
              placeholder="DEFAULT"
            />
          </label>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
            onClick={() => void load()}
            disabled={loading}
          >
            Cargar sede
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nombre comercial" value={data.parkingName ?? ""} onChange={(v) => setField("parkingName", v)} />
          <Field label="NIT" value={data.taxId ?? ""} onChange={(v) => setField("taxId", v)} />
          <Field label="Direccion" value={data.address ?? ""} onChange={(v) => setField("address", v)} />
          <Field label="Telefono" value={data.phone ?? ""} onChange={(v) => setField("phone", v)} />
          <Field
            label="Etiqueta sede (config)"
            value={data.siteLabel ?? ""}
            onChange={(v) => setField("siteLabel", v)}
          />
          <Field label="Moneda" value={data.currency ?? ""} onChange={(v) => setField("currency", v)} />
          <Field label="Zona horaria" value={data.timeZone ?? ""} onChange={(v) => setField("timeZone", v)} />
          <Field
            label="Minutos de gracia (defecto)"
            value={String(data.graceMinutesDefault ?? "")}
            onChange={(v) => setField("graceMinutesDefault", Number(v))}
          />
          <label className="text-xs font-semibold text-slate-600">
            Politica ticket perdido
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              value={data.lostTicketPolicy ?? "SURCHARGE_RATE"}
              onChange={(e) => setField("lostTicketPolicy", e.target.value)}
            >
              {LOST_TICKET_POLICIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(data.allowReprint)}
              onChange={(e) => setField("allowReprint", e.target.checked)}
            />
            Permitir reimpresion
          </label>
          <Field
            label="Max reimpresiones"
            value={String(data.maxReprints ?? "")}
            onChange={(v) => setField("maxReprints", Number(v))}
          />
          <Field label="Prefijo ticket" value={data.ticketPrefix ?? ""} onChange={(v) => setField("ticketPrefix", v)} />
          <Field label="Formato ticket" value={data.ticketFormat ?? ""} onChange={(v) => setField("ticketFormat", v)} />
          <Field
            label="Ancho papel (mm)"
            value={String(data.defaultPaperWidthMm ?? "")}
            onChange={(v) => setField("defaultPaperWidthMm", Number(v))}
          />
          <Field
            label="Impresora por defecto"
            value={data.defaultPrinterName ?? ""}
            onChange={(v) => setField("defaultPrinterName", v)}
          />
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(data.offlineModeEnabled)}
              onChange={(e) => setField("offlineModeEnabled", e.target.checked)}
            />
            Modo offline habilitado
          </label>
          <Field
            label="Intervalo sync (seg)"
            value={String(data.syncIntervalSeconds ?? "")}
            onChange={(v) => setField("syncIntervalSeconds", Number(v))}
          />
          <Field
            label="Timeout impresion (seg)"
            value={String(data.printTimeoutSeconds ?? "")}
            onChange={(v) => setField("printTimeoutSeconds", Number(v))}
          />
          <Field
            label="Mensaje legal ticket"
            value={data.ticketLegalMessage ?? ""}
            onChange={(v) => setField("ticketLegalMessage", v)}
          />
          <Field label="QR / codigo" value={data.qrConfig ?? ""} onChange={(v) => setField("qrConfig", v)} />
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(data.manualExitAllowed)}
              onChange={(e) => setField("manualExitAllowed", e.target.checked)}
            />
            Salida manual permitida
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={Boolean(data.allowOfflineEntryExit)}
              onChange={(e) => setField("allowOfflineEntryExit", e.target.checked)}
            />
            Operacion offline ingreso/salida
          </label>
          <p className="col-span-full text-xs font-semibold text-slate-700">Politica de caja (override por sede)</p>
          <label className="flex flex-col text-xs font-semibold text-slate-600">
            Cobro exige caja abierta
            <select
              className="mt-1 rounded-lg border border-slate-200 px-2 py-2 text-sm"
              value={
                data.cashRequireOpenForPayment === undefined
                  ? ""
                  : data.cashRequireOpenForPayment
                    ? "true"
                    : "false"
              }
              onChange={(e) => {
                const v = e.target.value;
                setData((d) => ({
                  ...(d ?? {}),
                  cashRequireOpenForPayment: v === "" ? undefined : v === "true"
                }));
              }}
            >
              <option value="">Heredar servidor (app.cash)</option>
              <option value="true">Si, exigir</option>
              <option value="false">No exigir</option>
            </select>
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-600">
            Permitir cierre de caja offline (cliente)
            <select
              className="mt-1 rounded-lg border border-slate-200 px-2 py-2 text-sm"
              value={
                data.cashOfflineCloseAllowed === undefined
                  ? ""
                  : data.cashOfflineCloseAllowed
                    ? "true"
                    : "false"
              }
              onChange={(e) => {
                const v = e.target.value;
                setData((d) => ({
                  ...(d ?? {}),
                  cashOfflineCloseAllowed: v === "" ? undefined : v === "true"
                }));
              }}
            >
              <option value="">Heredar servidor</option>
              <option value="true">Permitir</option>
              <option value="false">No permitir</option>
            </select>
          </label>
          <Field
            label="Tope movimiento manual offline (COP, vacio=heredar)"
            value={
              data.cashOfflineMaxManualMovement != null && !Number.isNaN(data.cashOfflineMaxManualMovement)
                ? String(data.cashOfflineMaxManualMovement)
                : ""
            }
            onChange={(v) =>
              setData((d) => ({
                ...(d ?? {}),
                cashOfflineMaxManualMovement:
                  v.trim() === "" ? undefined : Number(v.replace(",", "."))
              }))
            }
          />
        </div>

        {canEdit ? (
          <div className="flex flex-wrap gap-3 pt-4">
            <div className="min-w-[160px]">
              <Button
                label="Guardar parametros"
                onClick={() =>
                  void (async () => {
                    try {
                      const v = await validateParameters(data);
                      if (!v.ok) {
                        onNotify({
                          kind: "err",
                          text: v.errors.join("; ")
                        });
                        return;
                      }
                      const saved = await putParameters(
                        data,
                        paramSite.trim() || "DEFAULT",
                        auditReason
                      );
                      setData(saved);
                      onNotify({ kind: "ok", text: "Parametros guardados." });
                    } catch (e) {
                      onNotify({
                        kind: "err",
                        text: e instanceof Error ? e.message : "Error al guardar"
                      });
                    }
                  })()
                }
              />
            </div>
            <div className="min-w-[160px]">
              <Button
                label="Restaurar valores por defecto"
                tone="ghost"
                onClick={() => {
                  if (!confirm("Restaurar parametros por defecto en el servidor?")) return;
                  void (async () => {
                    try {
                      const saved = await resetParameters(
                        paramSite.trim() || "DEFAULT",
                        auditReason
                      );
                      setData(saved);
                      onNotify({ kind: "ok", text: "Parametros restaurados." });
                    } catch (e) {
                      onNotify({
                        kind: "err",
                        text: e instanceof Error ? e.message : "Error"
                      });
                    }
                  })();
                }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Solo lectura: no tiene permiso de edicion.</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function MastersSection({ onNotify }: { onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void; }) {
  const [rows, setRows] = useState<import("@/lib/settings-api").MasterVehicleTypeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<import("@/lib/settings-api").MasterVehicleTypeRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: "", name: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { fetchMasterVehicleTypes } = await import("@/lib/settings-api");
      setRows(await fetchMasterVehicleTypes());
    } catch (e) {
      onNotify({ kind: "err", text: e instanceof Error ? e.message : "Error cargando maestros" });
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center surface rounded-2xl p-4">
        <h2 className="text-lg font-semibold text-slate-900">Tipos de Vehículo</h2>
        <button
          type="button"
          className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white"
          onClick={() => { setCreating(true); setEditing(null); setForm({ code: "", name: "" }); }}
        >
          Nuevo tipo
        </button>
      </div>

      <DataTable
        columns={[
          { key: "code", label: "Código" },
          { key: "name", label: "Nombre" },
          { key: "isActive", label: "Activo", render: (r) => r.isActive ? "Sí" : "No" },
          { key: "id", label: "", render: (r) => (
            <button
              type="button"
              className="text-xs font-semibold text-amber-800"
              onClick={() => { setEditing(r as any); setCreating(false); setForm({ code: r.code, name: r.name }); }}
            >
              Editar
            </button>
          ) }
        ]}
        rows={rows as any[]}
      />

      {(creating || editing) ? (
        <div className="surface rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-900">{creating ? "Nuevo tipo" : "Editar tipo"}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Código (ej. CAR)
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                disabled={!!editing}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Nombre (ej. Carro)
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className="text-sm font-semibold text-slate-600" onClick={() => { setCreating(false); setEditing(null); }}>Cancelar</button>
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={async () => {
                try {
                  const { saveMasterVehicleType } = await import("@/lib/settings-api");
                  await saveMasterVehicleType(form, editing?.id);
                  onNotify({ kind: "ok", text: "Tipo guardado exitosamente" });
                  setCreating(false);
                  setEditing(null);
                  load();
                } catch(e) {
                  onNotify({ kind: "err", text: e instanceof Error ? e.message : "Error" });
                }
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
