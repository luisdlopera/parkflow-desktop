"use client";

import {
  Input,
  Select,
  SelectItem,
  Textarea,
  Checkbox,
  Button,
  Switch,
  RadioGroup,
  Radio,
} from "@heroui/react";
import { Chip } from "@heroui/chip";
import { Tabs, Tab } from "@heroui/tabs";
import { Card, CardBody, CardHeader } from "@heroui/card";
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
import {
  fetchMonthlyContracts,
  saveMonthlyContract,
  patchMonthlyContractStatus,
  fetchAgreements,
  saveAgreement,
  patchAgreementStatus,
  fetchPrepaidPackages,
  savePrepaidPackage,
  patchPrepaidPackageStatus,
  fetchPrepaidBalance,
  purchasePrepaidBalance,
  type MonthlyContractRow,
  type AgreementRow,
  type PrepaidPackageRow,
  type PrepaidBalanceRow,
  type RateCategory
} from "@/lib/settings-api";
import { useCallback, useEffect, useMemo, useState } from "react";

type TabKey = "rates" | "users" | "parameters" | "interface" | "masters" | "monthly" | "agreements" | "prepaid";

const VEHICLE_TYPES: VehicleType[] = ["CAR", "MOTORCYCLE", "BICYCLE", "TRUCK", "BUS", "VAN", "ELECTRIC", "OTHER"];
const RATE_TYPES: RateType[] = ["PER_MINUTE", "HOURLY", "DAILY", "FLAT"];
const RATE_TYPE_LABELS: Record<string, string> = {
  PER_MINUTE: "Por minuto",
  HOURLY: "Por hora",
  DAILY: "Diaria",
  FLAT: "Fija"
};
const RATE_CATEGORIES: RateCategory[] = ["STANDARD", "MONTHLY", "AGREEMENT", "PREPAID"];
const RATE_CATEGORY_LABELS: Record<string, string> = {
  STANDARD: "Estándar",
  MONTHLY: "Mensualidad",
  AGREEMENT: "Convenio",
  PREPAID: "Prepagado"
};
const DAYS_OF_WEEK = [
  { label: "Lun", bit: 0 },
  { label: "Mar", bit: 1 },
  { label: "Mié", bit: 2 },
  { label: "Jue", bit: 3 },
  { label: "Vie", bit: 4 },
  { label: "Sáb", bit: 5 },
  { label: "Dom", bit: 6 }
];
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

  // Configuración de interfaz (persistida en localStorage)
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
        label="Motivo de auditoría"
        description="Opcional, hasta 500 caracteres. Se envía al servidor en cambios sensibles."
        maxLength={500}
        value={auditReason}
        onChange={(e) => setAuditReason(e.target.value)}
        placeholder="Ej. Ajuste acordado con administración..."
        variant="flat"
        className="max-w-2xl"
      />

      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => setTab(key as TabKey)}
        aria-label="Configuración"
        color="primary"
        variant="underlined"
        classNames={{
          tab: "px-4 py-2",
          tabList: "gap-2 flex-wrap"
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
        <Tab key="monthly" title={<span>Mensualidades</span>} isDisabled={!can.ratesRead} />
        <Tab key="agreements" title={<span>Convenios</span>} isDisabled={!can.ratesRead} />
        <Tab key="prepaid" title={<span>Prepagados</span>} isDisabled={!can.ratesRead} />
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
              <span>Parámetros</span>
              {!can.cfgRead && <Chip size="sm" color="danger" variant="flat">Sin permiso</Chip>}
            </div>
          }
          isDisabled={!can.cfgRead}
        />
        <Tab key="interface" title={<div className="flex items-center gap-2"><span>Interfaz</span></div>} />
        <Tab
          key="masters"
          title={
            <div className="flex items-center gap-2">
              <span>Maestros</span>
              {!can.cfgRead && <Chip size="sm" color="danger" variant="flat">Sin permiso</Chip>}
            </div>
          }
          isDisabled={!can.cfgRead}
        />
      </Tabs>

      {tab === "rates" && can.ratesRead ? (
        <RatesSection canEdit={can.ratesEdit} onNotify={setNotice} auditReason={auditReason} />
      ) : null}
      {tab === "rates" && !can.ratesRead ? (
        <p className="text-sm text-slate-600">No tiene permiso para ver tarifas.</p>
      ) : null}

      {tab === "monthly" && can.ratesRead ? (
        <MonthlySection canEdit={can.ratesEdit} onNotify={setNotice} auditReason={auditReason} />
      ) : null}
      {tab === "monthly" && !can.ratesRead ? (
        <p className="text-sm text-slate-600">No tiene permiso para ver mensualidades.</p>
      ) : null}

      {tab === "agreements" && can.ratesRead ? (
        <AgreementsSection canEdit={can.ratesEdit} onNotify={setNotice} auditReason={auditReason} />
      ) : null}
      {tab === "agreements" && !can.ratesRead ? (
        <p className="text-sm text-slate-600">No tiene permiso para ver convenios.</p>
      ) : null}

      {tab === "prepaid" && can.ratesRead ? (
        <PrepaidSection canEdit={can.ratesEdit} onNotify={setNotice} auditReason={auditReason} />
      ) : null}
      {tab === "prepaid" && !can.ratesRead ? (
        <p className="text-sm text-slate-600">No tiene permiso para ver prepagados.</p>
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

      {tab === "masters" && can.cfgRead ? <MastersSection onNotify={setNotice} canEdit={can.cfgEdit} /> : null}
      {tab === "masters" && !can.cfgRead ? (
        <p className="text-sm text-slate-600">No tienes permisos para ver esta sección. Contacta a un administrador.</p>
      ) : null}
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
          <h2 className="text-lg font-semibold text-slate-900">Personalización del Sidebar</h2>
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
              color="primary"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">Mostrar atajos de teclado</p>
              <p className="text-sm text-slate-500">
                Muestra la sección de atajos de teclado (F1, F2, F3, F4, Esc) en la parte inferior del sidebar.
              </p>
            </div>
            <Switch
              isSelected={settings.showKeyboardShortcuts}
              onValueChange={(checked) => onUpdate("showKeyboardShortcuts", checked)}
              size="lg"
              color="primary"
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
              <p className="font-medium text-amber-800">Configuración local</p>
              <p className="text-sm text-amber-700">
                Estas preferencias se guardan solo en tu navegador y no afectan a otros usuarios.
                Se aplican inmediatamente sin necesidad de recargar la página.
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
  const [categoryFilter, setCategoryFilter] = useState("");
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
          <Input
            label="Sede"
            variant="flat"
            size="sm"
            value={site}
            onValueChange={setSite}
          />
          <Input
            label="Buscar"
            placeholder="Nombre..."
            variant="flat"
            size="sm"
            value={q}
            onValueChange={setQ}
          />
          <Select
            label="Estado"
            variant="flat"
            size="sm"
            className="max-w-[120px]"
            selectedKeys={activeFilter === null ? [""] : [String(activeFilter)]}
            onSelectionChange={(keys) => {
              const v = Array.from(keys)[0] as string;
              setActiveFilter(v === "" ? null : v === "true");
            }}
          >
            <SelectItem key="">Todos</SelectItem>
            <SelectItem key="true">Activas</SelectItem>
            <SelectItem key="false">Inactivas</SelectItem>
          </Select>
          <Select
            label="Categoría"
            variant="flat"
            size="sm"
            className="max-w-[140px]"
            selectedKeys={[categoryFilter]}
            onSelectionChange={(keys) => setCategoryFilter(Array.from(keys)[0] as string)}
          >
            {[
              <SelectItem key="" textValue="Todas">Todas</SelectItem>,
              ...RATE_CATEGORIES.map(c => (
                <SelectItem key={c} textValue={RATE_CATEGORY_LABELS[c]}>{RATE_CATEGORY_LABELS[c]}</SelectItem>
              ))
            ]}
          </Select>
          <Button
            variant="bordered"
            color="primary"
            size="md"
            className="font-semibold"
            onPress={() => void load()}
            isLoading={loading}
          >
            Actualizar
          </Button>
          {canEdit ? (
            <Button
              color="primary"
              size="md"
              className="font-semibold"
              onPress={() => {
                setEditing(null);
                setCreating(true);
              }}
            >
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
            <Button
              size="sm"
              variant="light"
              color="primary"
              className="font-semibold"
              onPress={() => setRateDetail(null)}
            >
              Cerrar
            </Button>
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
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    className="font-semibold"
                    onPress={() =>
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
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="font-semibold"
                    onPress={() => {
                      setCreating(false);
                      setEditing(r);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="font-semibold"
                    onPress={() =>
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
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="danger"
                    className="font-semibold"
                    onPress={() => {
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
                  </Button>
                </div>
              ) : (
                ""
              )
          }
        ]}
        rows={rows}
      />

      <div className="flex items-center gap-4">
        <Button
          size="sm"
          variant="flat"
          color="primary"
          isDisabled={page <= 0}
          onPress={() => setPage((p) => Math.max(0, p - 1))}
        >
          Anterior
        </Button>
        <span className="text-sm font-medium text-slate-600">
          Pagina {page + 1} de {Math.max(1, totalPages)}
        </span>
        <Button
          size="sm"
          variant="flat"
          color="primary"
          isDisabled={page + 1 >= totalPages}
          onPress={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
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
  // Topes
  const [minSession, setMinSession] = useState(String((initial as RateRow).minSessionValue ?? ""));
  const [maxSession, setMaxSession] = useState(String((initial as RateRow).maxSessionValue ?? ""));
  const [maxDaily, setMaxDaily] = useState(String((initial as RateRow).maxDailyValue ?? ""));
  // Recargos
  const [nightPct, setNightPct] = useState(String((initial as RateRow).nightSurchargePercent ?? 0));
  const [holidayPct, setHolidayPct] = useState(String((initial as RateRow).holidaySurchargePercent ?? 0));
  const [appliesNight, setAppliesNight] = useState((initial as RateRow).appliesNight ?? false);
  const [appliesHoliday, setAppliesHoliday] = useState((initial as RateRow).appliesHoliday ?? false);
  // Días de la semana
  const initBitmap = (initial as RateRow).appliesDaysBitmap ?? null;
  const [daysBitmap, setDaysBitmap] = useState<number | null>(initBitmap);
  const toggleDay = (bit: number) => {
    const current = daysBitmap ?? 0;
    const newVal = current ^ (1 << bit);
    // Si todos los bits están activados (127) o ninguno, usa null (todos los días)
    setDaysBitmap(newVal === 0 || newVal === 127 ? null : newVal);
  };
  const isDayActive = (bit: number) => daysBitmap === null ? true : Boolean(daysBitmap & (1 << bit));
  // Franja horaria
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
        <Input label="Nombre" variant="flat" size="sm" value={name} onValueChange={setName} />
        <Input label="Sede" variant="flat" size="sm" value={site} onValueChange={setSite} />
        <Select
          label="Categoría"
          variant="flat"
          size="sm"
          selectedKeys={[category]}
          onSelectionChange={(keys) => setCategory(Array.from(keys)[0] as RateCategory)}
        >
          {RATE_CATEGORIES.map((c) => (
            <SelectItem key={c} textValue={RATE_CATEGORY_LABELS[c]}>
              {RATE_CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </Select>
        <Select
          label="Tipo vehículo"
          description="Vacío = todos"
          variant="flat"
          size="sm"
          selectedKeys={[vehicleType]}
          onSelectionChange={(keys) => setVehicleType(Array.from(keys)[0] as string)}
        >
          {[
            <SelectItem key="" textValue="(Todos)">(Todos)</SelectItem>,
            ...vehicleTypes.map((v) => (
              <SelectItem key={v.code} textValue={v.name}>
                {v.name} ({v.code})
              </SelectItem>
            ))
          ]}
        </Select>
        <Select
          label="Tipo tarifa"
          variant="flat"
          size="sm"
          selectedKeys={[rateType]}
          onSelectionChange={(keys) => setRateType(Array.from(keys)[0] as RateType)}
        >
          {RATE_TYPES.map((v) => (
            <SelectItem key={v} textValue={RATE_TYPE_LABELS[v] ?? v}>
              {RATE_TYPE_LABELS[v] ?? v}
            </SelectItem>
          ))}
        </Select>
        <Input
          label="Valor"
          variant="flat"
          size="sm"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onValueChange={setAmount}
        />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-slate-600">Minutos gracia / tolerancia / fraccion</p>
          <div className="flex gap-2">
            <Input
              variant="flat"
              size="sm"
              type="number"
              min="0"
              placeholder="Gracia"
              value={grace}
              onValueChange={setGrace}
            />
            <Input
              variant="flat"
              size="sm"
              type="number"
              min="0"
              placeholder="Tolerancia"
              value={tolerance}
              onValueChange={setTolerance}
            />
            <Input
              variant="flat"
              size="sm"
              type="number"
              min="1"
              placeholder="Fracción"
              value={fraction}
              onValueChange={setFraction}
            />
          </div>
        </div>
        <Select
          label="Redondeo"
          variant="flat"
          size="sm"
          selectedKeys={[rounding]}
          onSelectionChange={(keys) => setRounding(Array.from(keys)[0] as "UP" | "DOWN" | "NEAREST")}
        >
          {ROUNDING.map((v) => (
            <SelectItem key={v} textValue={v}>
              {v}
            </SelectItem>
          ))}
        </Select>
        <Input
          label="Recargo ticket perdido"
          variant="flat"
          size="sm"
          type="number"
          step="0.01"
          min="0"
          value={lost}
          onValueChange={setLost}
        />
        <Checkbox isSelected={active} onValueChange={setActive}>
          Activa
        </Checkbox>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Franja (opcional) HH:MM</span>
          <div className="flex gap-3">
            <Input
              variant="flat"
              size="sm"
              placeholder="08:00"
              value={wStart}
              onValueChange={setWStart}
            />
            <Input
              variant="flat"
              size="sm"
              placeholder="18:00"
              value={wEnd}
              onValueChange={setWEnd}
            />
          </div>
        </div>
        {/* Días de la semana */}
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
                    : "bg-transparent text-slate-600 border-slate-300 hover:border-primary"
                }`}
              >
                {label}
              </button>
            ))}
            {daysBitmap !== null && (
              <button
                type="button"
                onClick={() => setDaysBitmap(null)}
                className="px-3 py-1 rounded-lg text-xs font-semibold border border-slate-300 text-slate-500 hover:border-rose-400 hover:text-rose-500 transition-colors"
              >
                Todos
              </button>
            )}
          </div>
        </div>
        {/* Topes min/max */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topes de sesión (opcional)</span>
          <div className="flex gap-2">
            <Input
              variant="flat"
              size="sm"
              type="number"
              step="0.01"
              min="0"
              placeholder="Mínimo"
              value={minSession}
              onValueChange={setMinSession}
            />
            <Input
              variant="flat"
              size="sm"
              type="number"
              step="0.01"
              min="0"
              placeholder="Máximo"
              value={maxSession}
              onValueChange={setMaxSession}
            />
          </div>
        </div>
        <Input
          label="Máximo diario (opcional)"
          variant="flat"
          size="sm"
          type="number"
          step="0.01"
          min="0"
          value={maxDaily}
          onValueChange={setMaxDaily}
        />
        {/* Recargos nocturno y festivo */}
        <div className="flex flex-col gap-2">
          <Checkbox isSelected={appliesNight} onValueChange={setAppliesNight}>
            Aplica horario nocturno
          </Checkbox>
          {appliesNight && (
            <Input
              label="Recargo nocturno (%)"
              variant="flat"
              size="sm"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={nightPct}
              onValueChange={setNightPct}
            />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Checkbox isSelected={appliesHoliday} onValueChange={setAppliesHoliday}>
            Aplica festivos
          </Checkbox>
          {appliesHoliday && (
            <Input
              label="Recargo festivo (%)"
              variant="flat"
              size="sm"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={holidayPct}
              onValueChange={setHolidayPct}
            />
          )}
        </div>
        <div className="md:col-span-2 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vigencia programada (opcional, local)</span>
          <div className="flex flex-wrap gap-3">
            <Input
              type="datetime-local"
              variant="flat"
              size="sm"
              value={schedFrom}
              onValueChange={setSchedFrom}
              className="min-w-[200px] flex-1"
            />
            <Input
              type="datetime-local"
              variant="flat"
              size="sm"
              value={schedTo}
              onValueChange={setSchedTo}
              className="min-w-[200px] flex-1"
            />
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="light"
          color="primary"
          className="font-semibold"
          onPress={onCancel}
        >
          Cancelar
        </Button>
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
                onError(e instanceof Error ? e.message : "Error guardando");
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
        <Input
          label="Buscar"
          placeholder="Nombre o correo..."
          variant="flat"
          size="sm"
          value={q}
          onValueChange={setQ}
          className="max-w-xs"
        />
        <Select
          label="Estado"
          variant="flat"
          size="sm"
          className="max-w-[120px]"
          selectedKeys={activeFilter === null ? [""] : [String(activeFilter)]}
          onSelectionChange={(keys) => {
            const v = Array.from(keys)[0] as string;
            setActiveFilter(v === "" ? null : v === "true");
          }}
        >
          <SelectItem key="">Todos</SelectItem>
          <SelectItem key="true">Activos</SelectItem>
          <SelectItem key="false">Inactivos</SelectItem>
        </Select>
        <Button
          variant="bordered"
          color="primary"
          size="md"
          className="font-semibold"
          onPress={() => void load()}
          isLoading={loading}
        >
          Actualizar
        </Button>
        {canEdit ? (
          <Button
            color="primary"
            size="md"
            className="font-semibold"
            onPress={() => setShowCreate(true)}
          >
            Nuevo usuario
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Cargando...</p> : null}

      {userDetailLoading ? <p className="text-sm text-slate-500">Cargando detalle...</p> : null}
      {userDetail ? (
        <div className="surface rounded-2xl p-4 text-sm text-slate-800 space-y-1">
          <div className="flex justify-between gap-2">
            <h3 className="font-semibold text-slate-900">Detalle usuario</h3>
            <Button
              size="sm"
              variant="light"
              color="primary"
              className="font-semibold"
              onPress={() => setUserDetail(null)}
            >
              Cerrar
            </Button>
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
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    className="font-semibold"
                    onPress={() =>
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
                  </Button>
                  {canEdit ? (
                    <>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="font-semibold"
                        onPress={() => setEditing(u)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="font-semibold"
                        onPress={() =>
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
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="font-semibold"
                        onPress={() => {
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
                      </Button>
                    </>
                  ) : null}
                </div>
              );
            }
          }
        ]}
        rows={rows}
      />

      <div className="flex items-center gap-4 text-xs text-slate-600">
        <Button
          size="sm"
          variant="flat"
          color="primary"
          isDisabled={page <= 0}
          className="font-semibold"
          onPress={() => setPage((p) => Math.max(0, p - 1))}
        >
          Anterior
        </Button>
        <span className="font-medium">
          Página {page + 1} / {Math.max(1, totalPages)}
        </span>
        <Button
          size="sm"
          variant="flat"
          color="primary"
          isDisabled={page + 1 >= totalPages}
          className="font-semibold"
          onPress={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
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
        <Input variant="flat" size="sm" placeholder="Nombre" value={name} onValueChange={setName} />
        <Input variant="flat" size="sm" placeholder="Correo" value={email} onValueChange={setEmail} />
        <Select
          label="Rol"
          variant="flat"
          size="sm"
          selectedKeys={[role]}
          onSelectionChange={(keys) => setRole(Array.from(keys)[0] as UserRole)}
        >
          {ROLES.map((r) => (
            <SelectItem key={r} textValue={r}>
              {r}
            </SelectItem>
          ))}
        </Select>
        <Input variant="flat" size="sm" placeholder="Contrasena inicial (min 8)" type="password" value={password} onValueChange={setPassword} />
        <Input variant="flat" size="sm" placeholder="Documento (opcional)" value={document} onValueChange={setDocument} />
        <Input variant="flat" size="sm" placeholder="Telefono" value={phone} onValueChange={setPhone} />
        <Input variant="flat" size="sm" placeholder="Sede" value={site} onValueChange={setSite} />
        <Input variant="flat" size="sm" placeholder="Terminal / caja" value={terminal} onValueChange={setTerminal} />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="min-w-[120px]">
          <Button
            color="primary"
            className="font-bold w-full"
            onPress={() =>
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
          >
            Crear
          </Button>
        </div>
        <div className="min-w-[120px]">
          <Button variant="light" color="primary" className="font-semibold w-full" onPress={onClose}>
            Cerrar
          </Button>
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
        <Input variant="flat" size="sm" placeholder="Nombre" value={name} onValueChange={setName} />
        <Input variant="flat" size="sm" placeholder="Correo" value={email} onValueChange={setEmail} />
        <Select
          label="Rol"
          variant="flat"
          size="sm"
          selectedKeys={[role]}
          onSelectionChange={(keys) => setRole(Array.from(keys)[0] as UserRole)}
        >
          {ROLES.map((r) => (
            <SelectItem key={r} textValue={r}>
              {r}
            </SelectItem>
          ))}
        </Select>
        <Input variant="flat" size="sm" placeholder="Documento" value={document} onValueChange={setDocument} />
        <Input variant="flat" size="sm" placeholder="Telefono" value={phone} onValueChange={setPhone} />
        <Input variant="flat" size="sm" placeholder="Sede" value={site} onValueChange={setSite} />
        <Input variant="flat" size="sm" placeholder="Terminal" value={terminal} onValueChange={setTerminal} />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="min-w-[120px]">
          <Button
            color="primary"
            className="font-bold w-full"
            onPress={() =>
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
          >
            Guardar
          </Button>
        </div>
        <div className="min-w-[120px]">
          <Button variant="light" color="primary" className="font-semibold w-full" onPress={onClose}>
            Cerrar
          </Button>
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

  const setField = (k: keyof ParkingParametersPayload, v: string | number | boolean | undefined) => {
    setData((d) => ({ ...(d ?? {}), [k]: v }));
  };
  const setOptionalNumber = (k: keyof ParkingParametersPayload, v: string) => {
    setField(k, v.trim() === "" ? undefined : Number(v.replace(",", ".")));
  };

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Parametros del parqueadero</h2>
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-4">
          <Input
            label="Codigo de sede (persistencia)"
            variant="flat"
            size="sm"
            className="max-w-xs"
            value={paramSite}
            onValueChange={setParamSite}
            placeholder="DEFAULT"
          />
          <Button
            variant="bordered"
            color="primary"
            size="md"
            className="font-semibold"
            onPress={() => void load()}
            isLoading={loading}
          >
            Cargar sede
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Nombre comercial" value={data.parkingName ?? ""} onChange={(v) => setField("parkingName", v)} />
          <Field label="NIT" value={data.taxId ?? ""} onChange={(v) => setField("taxId", v)} />
          <Field
            label="DV NIT"
            value={data.taxIdCheckDigit ?? ""}
            onChange={(v) => setField("taxIdCheckDigit", v)}
          />
          <Field
            label="Razon social (FE / tributario)"
            value={data.businessLegalName ?? ""}
            onChange={(v) => setField("businessLegalName", v)}
          />
          <Field label="Direccion" value={data.address ?? ""} onChange={(v) => setField("address", v)} />
          <Field label="Telefono" value={data.phone ?? ""} onChange={(v) => setField("phone", v)} />
          <Field
            label="Etiqueta sede (config)"
            value={data.siteLabel ?? ""}
            onChange={(v) => setField("siteLabel", v)}
          />
          <Field label="Moneda" value={data.currency ?? ""} onChange={(v) => setField("currency", v)} />
          <Field label="Zona horaria" value={data.timeZone ?? ""} onChange={(v) => setField("timeZone", v)} />
          <Field label="Logo / URL marca" value={data.logoUrl ?? ""} onChange={(v) => setField("logoUrl", v)} />
          <Field
            label="Color marca"
            value={data.brandColor ?? ""}
            onChange={(v) => setField("brandColor", v)}
          />
          <Field label="Impuesto" value={data.taxName ?? ""} onChange={(v) => setField("taxName", v)} />
          <Field
            label="Impuesto (%)"
            value={data.taxRatePercent != null ? String(data.taxRatePercent) : ""}
            onChange={(v) => setOptionalNumber("taxRatePercent", v)}
          />
          <div className="flex items-center py-2">
            <Checkbox
              isSelected={data.pricesIncludeTax ?? true}
              onValueChange={(v) => setField("pricesIncludeTax", v)}
            >
              Tarifas incluyen impuesto
            </Checkbox>
          </div>
          <Field
            label="Minutos de gracia (defecto)"
            value={String(data.graceMinutesDefault ?? "")}
            onChange={(v) => setOptionalNumber("graceMinutesDefault", v)}
          />
          <Select
            label="Politica ticket perdido"
            variant="flat"
            size="sm"
            selectedKeys={[data.lostTicketPolicy ?? "SURCHARGE_RATE"]}
            onSelectionChange={(keys) => setField("lostTicketPolicy", Array.from(keys)[0] as string)}
          >
            {LOST_TICKET_POLICIES.map((p) => (
              <SelectItem key={p.value} textValue={p.label}>
                {p.label}
              </SelectItem>
            ))}
          </Select>

          <div className="flex flex-col gap-4 py-2">
            <Checkbox
              isSelected={Boolean(data.allowReprint)}
              onValueChange={(v) => setField("allowReprint", v)}
            >
              Permitir reimpresion
            </Checkbox>
            <Checkbox
              isSelected={Boolean(data.offlineModeEnabled)}
              onValueChange={(v) => setField("offlineModeEnabled", v)}
            >
              Modo offline habilitado
            </Checkbox>
          </div>

          <Field
            label="Max reimpresiones"
            value={String(data.maxReprints ?? "")}
            onChange={(v) => setOptionalNumber("maxReprints", v)}
          />
          <Field label="Prefijo ticket" value={data.ticketPrefix ?? ""} onChange={(v) => setField("ticketPrefix", v)} />
          <Field label="Formato ticket" value={data.ticketFormat ?? ""} onChange={(v) => setField("ticketFormat", v)} />
          <Field
            label="Ancho papel (mm)"
            value={String(data.defaultPaperWidthMm ?? "")}
            onChange={(v) => setOptionalNumber("defaultPaperWidthMm", v)}
          />
          <Field
            label="Impresora por defecto"
            value={data.defaultPrinterName ?? ""}
            onChange={(v) => setField("defaultPrinterName", v)}
          />

          <Field
            label="Intervalo sync (seg)"
            value={String(data.syncIntervalSeconds ?? "")}
            onChange={(v) => setOptionalNumber("syncIntervalSeconds", v)}
          />
          <Field
            label="Timeout impresion (seg)"
            value={String(data.printTimeoutSeconds ?? "")}
            onChange={(v) => setOptionalNumber("printTimeoutSeconds", v)}
          />
          <Field label="QR / codigo" value={data.qrConfig ?? ""} onChange={(v) => setField("qrConfig", v)} />

          <div className="col-span-full grid gap-4 border-t border-slate-100 pt-6 md:grid-cols-2">
            <Textarea
              label="Mensaje encabezado ticket"
              variant="flat"
              size="sm"
              minRows={2}
              value={data.ticketHeaderMessage ?? ""}
              onValueChange={(v) => setField("ticketHeaderMessage", v)}
            />
            <Textarea
              label="Mensaje pie ticket"
              variant="flat"
              size="sm"
              minRows={2}
              value={data.ticketFooterMessage ?? ""}
              onValueChange={(v) => setField("ticketFooterMessage", v)}
            />
            <Textarea
              label="Mensaje legal ticket"
              variant="flat"
              size="sm"
              minRows={3}
              value={data.ticketLegalMessage ?? ""}
              onValueChange={(v) => setField("ticketLegalMessage", v)}
            />
            <Textarea
              label="Reglas de operacion"
              variant="flat"
              size="sm"
              minRows={3}
              value={data.operationRulesMessage ?? ""}
              onValueChange={(v) => setField("operationRulesMessage", v)}
            />
          </div>

          <div className="flex flex-col gap-4 py-2">
            <Checkbox
              isSelected={Boolean(data.manualExitAllowed)}
              onValueChange={(v) => setField("manualExitAllowed", v)}
            >
              Salida manual permitida
            </Checkbox>
            <Checkbox
              isSelected={Boolean(data.allowOfflineEntryExit)}
              onValueChange={(v) => setField("allowOfflineEntryExit", v)}
            >
              Operacion offline ingreso/salida
            </Checkbox>
          </div>

          <div className="col-span-full pt-6 border-t border-slate-100 mt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Facturacion electronica Colombia (DIAN)
            </p>
            <p className="text-xs text-slate-500 mb-4 max-w-3xl leading-relaxed">
              Estos datos aparecen en el comprobante de cierre tipo Z termico y documentacion soporte. CUFE,
              firma XAdES y envio XML a la DIAN requieren PSC certificado; aqui solo se guardan parametros de
              autorizacion y numeracion por sede.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Prefijo autorizado (ej. SETP)"
                value={data.dianInvoicePrefix ?? ""}
                onChange={(v) => setField("dianInvoicePrefix", v)}
              />
              <Field
                label="No. resolucion DIAN"
                value={data.dianResolutionNumber ?? ""}
                onChange={(v) => setField("dianResolutionNumber", v)}
              />
              <Field
                label="Fecha resolucion (YYYY-MM-DD)"
                value={data.dianResolutionDate ?? ""}
                onChange={(v) => setField("dianResolutionDate", v)}
              />
              <Field
                label="Rango desde (consecutivo)"
                value={data.dianRangeFrom ?? ""}
                onChange={(v) => setField("dianRangeFrom", v)}
              />
              <Field
                label="Rango hasta (consecutivo)"
                value={data.dianRangeTo ?? ""}
                onChange={(v) => setField("dianRangeTo", v)}
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <Textarea
                  label="Clave tecnica (opcional)"
                  variant="flat"
                  size="sm"
                  minRows={2}
                  placeholder="Si su PSC solicita persistirla en sede..."
                  value={data.dianTechnicalKey ?? ""}
                  onValueChange={(v) => setField("dianTechnicalKey", v)}
                />
              </div>
            </div>
          </div>

          <div className="col-span-full pt-6 border-t border-slate-100 mt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Integracion PSC (cierre caja)
            </p>
            <p className="text-xs text-slate-500 mb-4 max-w-3xl leading-relaxed">
              Consecutivos y webhook se aplican cuando se ejecuta cerrar caja (commit). El servidor envia POST
              JSON con evento parkflow.cash.closed.v1; el PSC debe responder 2xx sin bloquear al cajero.
            </p>
            <div className="flex flex-wrap gap-x-10 gap-y-3 py-1">
              <Checkbox
                isSelected={Boolean(data.cashFeSequentialEnabled)}
                onValueChange={(v) => setData((d) => ({ ...(d ?? {}), cashFeSequentialEnabled: v }))}
              >
                Consecutivo soporte al cierre
              </Checkbox>
              <Checkbox
                isSelected={Boolean(data.cashFeSequencePerTerminal)}
                onValueChange={(v) => setData((d) => ({ ...(d ?? {}), cashFeSequencePerTerminal: v }))}
              >
                Llave correlativa por terminal
              </Checkbox>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
              <Field
                label="Digitos consecutivo (6–13)"
                value={
                  data.cashFeSequenceDigits != null ? String(data.cashFeSequenceDigits) : ""
                }
                onChange={(v) =>
                  setData((d) => ({
                    ...(d ?? {}),
                    cashFeSequenceDigits: v.trim() === "" ? undefined : Number(v.replace(",", "."))
                  }))
                }
              />
              <div className="lg:col-span-2">
                <Field
                  label="Webhook URL PSC"
                  value={data.cashFeOutboundWebhookUrl ?? ""}
                  onChange={(v) => setField("cashFeOutboundWebhookUrl", v)}
                />
              </div>
            </div>
            <div className="mt-4">
              <Textarea
                label="Webhook Authorization (Bearer opcional)"
                variant="flat"
                size="sm"
                minRows={2}
                placeholder="Ej. Bearer eyJ..."
                value={data.cashFeOutboundWebhookBearer ?? ""}
                onValueChange={(v) => setField("cashFeOutboundWebhookBearer", v)}
              />
            </div>
          </div>

          <div className="col-span-full pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Politica de caja (override por sede)</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Cobro exige caja abierta"
                variant="flat"
                size="sm"
                selectedKeys={[data.cashRequireOpenForPayment === undefined ? "" : String(data.cashRequireOpenForPayment)]}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0] as string;
                  setData((d) => ({
                    ...(d ?? {}),
                    cashRequireOpenForPayment: v === "" ? undefined : v === "true"
                  }));
                }}
              >
                <SelectItem key="">Heredar servidor (app.cash)</SelectItem>
                <SelectItem key="true">Si, exigir</SelectItem>
                <SelectItem key="false">No exigir</SelectItem>
              </Select>

              <Select
                label="Permitir cierre de caja offline"
                variant="flat"
                size="sm"
                selectedKeys={[data.cashOfflineCloseAllowed === undefined ? "" : String(data.cashOfflineCloseAllowed)]}
                onSelectionChange={(keys) => {
                  const v = Array.from(keys)[0] as string;
                  setData((d) => ({
                    ...(d ?? {}),
                    cashOfflineCloseAllowed: v === "" ? undefined : v === "true"
                  }));
                }}
              >
                <SelectItem key="">Heredar servidor</SelectItem>
                <SelectItem key="true">Permitir</SelectItem>
                <SelectItem key="false">No permitir</SelectItem>
              </Select>

              <Field
                label="Tope manual offline (COP)"
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
          </div>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              color="primary"
              className="font-semibold"
              onPress={() =>
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
            >
              Guardar parametros
            </Button>
            <Button
              variant="bordered"
              color="primary"
              className="font-semibold"
              onPress={() => {
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
            >
              Restaurar valores por defecto
            </Button>
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
    <Input
      label={label}
      variant="flat"
      size="sm"
      value={value}
      onValueChange={onChange}
    />
  );
}

type VehicleTypeFormState = {
  code: string;
  name: string;
  icon: string;
  color: string;
  requiresPlate: boolean;
  hasOwnRate: boolean;
  quickAccess: boolean;
  requiresPhoto: boolean;
  displayOrder: number;
};

const defaultVehicleTypeForm: VehicleTypeFormState = {
  code: "",
  name: "",
  icon: "🚗",
  color: "#2563EB",
  requiresPlate: true,
  hasOwnRate: true,
  quickAccess: true,
  requiresPhoto: false,
  displayOrder: 0
};

function vehicleTypeToForm(row: import("@/lib/settings-api").MasterVehicleTypeRow): VehicleTypeFormState {
  return {
    code: row.code,
    name: row.name,
    icon: row.icon ?? "🚗",
    color: row.color ?? "#2563EB",
    requiresPlate: row.requiresPlate ?? true,
    hasOwnRate: row.hasOwnRate ?? true,
    quickAccess: row.quickAccess ?? true,
    requiresPhoto: row.requiresPhoto ?? false,
    displayOrder: row.displayOrder ?? 0
  };
}

function MastersSection({
  onNotify,
  canEdit
}: {
  onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<import("@/lib/settings-api").MasterVehicleTypeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<import("@/lib/settings-api").MasterVehicleTypeRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleTypeFormState>(defaultVehicleTypeForm);

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

  const toggleActive = useCallback(async (id: string, current: boolean) => {
    setTogglingId(id);
    try {
      const { patchVehicleTypeStatus } = await import("@/lib/settings-api");
      await patchVehicleTypeStatus(id, !current);
      setRows(prev => prev.map(r => r.id === id ? { ...r, isActive: !current } : r));
      onNotify({ kind: "ok", text: current ? "Tipo desactivado" : "Tipo activado" });
    } catch (e) {
      onNotify({ kind: "err", text: e instanceof Error ? e.message : "Error cambiando estado" });
    } finally {
      setTogglingId(null);
    }
  }, [onNotify]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center surface rounded-2xl p-4">
        <h2 className="text-lg font-semibold text-slate-900">Tipos de Vehículo</h2>
        {canEdit ? (
          <Button
            color="primary"
            size="md"
            className="font-semibold"
            onPress={() => { setCreating(true); setEditing(null); setForm(defaultVehicleTypeForm); }}
          >
            Nuevo tipo
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={[
          {
            key: "icon",
            label: "",
            render: (r) => (
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg text-white shadow-sm"
                style={{ backgroundColor: r.color ?? "#64748B" }}
              >
                {r.icon ?? "🚗"}
              </span>
            )
          },
          { key: "code", label: "Código" },
          { key: "name", label: "Nombre" },
          {
            key: "displayOrder",
            label: "Orden",
            render: (r) => r.displayOrder ?? 0
          },
          {
            key: "requiresPlate",
            label: "Placa",
            render: (r) => r.requiresPlate ? "Requerida" : "Opcional"
          },
          {
            key: "hasOwnRate",
            label: "Tarifa",
            render: (r) => r.hasOwnRate ? "Propia" : "Compartida"
          },
          {
            key: "quickAccess",
            label: "Rápido",
            render: (r) => r.quickAccess ? "Sí" : "No"
          },
          {
            key: "isActive",
            label: "Activo",
            render: (r) => (
              <Switch
                isSelected={r.isActive}
                isDisabled={togglingId === r.id || !canEdit}
                size="sm"
                color={r.isActive ? "success" : "danger"}
                onValueChange={() => toggleActive(r.id, r.isActive)}
                aria-label={r.isActive ? "Desactivar tipo" : "Activar tipo"}
              />
            )
          },
          {
            key: "id",
            label: "",
            render: (r) =>
              canEdit ? (
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="font-semibold"
                  onPress={() => { setEditing(r as any); setCreating(false); setForm(vehicleTypeToForm(r)); }}
                >
                  Editar
                </Button>
              ) : (
                ""
              )
          }
        ]}
        rows={rows as any[]}
      />

      {(creating || editing) && canEdit ? (
        <div className="surface rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-slate-900">{creating ? "Nuevo tipo" : "Editar tipo"}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input
              label="Código (ej. CAR)"
              variant="flat"
              size="sm"
              classNames={{ input: "uppercase" }}
              value={form.code}
              onValueChange={(val) => setForm({ ...form, code: val.toUpperCase() })}
              isDisabled={!!editing}
            />
            <Input
              label="Nombre (ej. Carro)"
              variant="flat"
              size="sm"
              value={form.name}
              onValueChange={(val) => setForm({ ...form, name: val })}
            />
            <Input
              label="Icono"
              variant="flat"
              size="sm"
              maxLength={40}
              value={form.icon}
              onValueChange={(val) => setForm({ ...form, icon: val })}
            />
            <Input
              label="Color"
              variant="flat"
              size="sm"
              type="color"
              value={form.color}
              onValueChange={(val) => setForm({ ...form, color: val.toUpperCase() })}
            />
            <Input
              label="Orden"
              variant="flat"
              size="sm"
              type="number"
              min={0}
              value={String(form.displayOrder)}
              onValueChange={(val) => setForm({ ...form, displayOrder: Number.parseInt(val || "0", 10) })}
            />
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl text-white"
                style={{ backgroundColor: form.color || "#64748B" }}
              >
                {form.icon || "🚗"}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{form.name || "Vista previa"}</p>
                <p className="text-xs text-slate-500">{form.code || "CODIGO"}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Switch
              isSelected={form.requiresPlate}
              onValueChange={(val) => setForm({ ...form, requiresPlate: val })}
              size="sm"
            >
              Requiere placa
            </Switch>
            <Switch
              isSelected={form.hasOwnRate}
              onValueChange={(val) => setForm({ ...form, hasOwnRate: val })}
              size="sm"
            >
              Tarifa propia
            </Switch>
            <Switch
              isSelected={form.quickAccess}
              onValueChange={(val) => setForm({ ...form, quickAccess: val })}
              size="sm"
            >
              Acceso rápido
            </Switch>
            <Switch
              isSelected={form.requiresPhoto}
              onValueChange={(val) => setForm({ ...form, requiresPhoto: val })}
              size="sm"
            >
              Requiere foto
            </Switch>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="light" color="primary" className="font-semibold" onPress={() => { setCreating(false); setEditing(null); }}>Cancelar</Button>
            <Button
              color="success"
              className="font-semibold text-white"
              onPress={async () => {
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
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MonthlySection({ canEdit, onNotify, auditReason }: { canEdit: boolean; onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void; auditReason: string; }) {
  const [rows, setRows] = useState<import("@/lib/settings-api").MonthlyContractRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [plate, setPlate] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { fetchMonthlyContracts } = await import("@/lib/settings-api");
      const res = await fetchMonthlyContracts({ plate: plate || undefined, page, size: 15 });
      setRows(res.content);
      setTotalPages(res.totalPages);
    } catch (e) {
      onNotify({ kind: "err", text: e instanceof Error ? e.message : "Error cargando" });
    } finally {
      setLoading(false);
    }
  }, [plate, page, onNotify]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex gap-3 items-end">
        <Input label="Placa" variant="flat" size="sm" value={plate} onValueChange={setPlate} className="w-48" />
        <Button color="primary" variant="bordered" size="md" onPress={() => void load()} isLoading={loading}>Buscar</Button>
      </div>
      <DataTable
        columns={[
          { key: "plate", label: "Placa" },
          { key: "holderName", label: "Titular" },
          { key: "startDate", label: "Desde" },
          { key: "endDate", label: "Hasta" },
          { key: "amount", label: "Valor" },
          { key: "active", label: "Activa", render: (r) => (r.active ? "Sí" : "No") }
        ]}
        rows={rows as any[]}
      />
      <div className="flex items-center gap-4">
        <Button size="sm" variant="flat" color="primary" isDisabled={page <= 0} onPress={() => setPage(p => Math.max(0, p - 1))}>Anterior</Button>
        <span className="text-sm">Página {page + 1} de {Math.max(1, totalPages)}</span>
        <Button size="sm" variant="flat" color="primary" isDisabled={page + 1 >= totalPages} onPress={() => setPage(p => p + 1)}>Siguiente</Button>
      </div>
    </div>
  );
}

function AgreementsSection({ canEdit, onNotify, auditReason }: { canEdit: boolean; onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void; auditReason: string; }) {
  const [rows, setRows] = useState<import("@/lib/settings-api").AgreementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { fetchAgreements } = await import("@/lib/settings-api");
      const res = await fetchAgreements({ q: q || undefined, page, size: 15 });
      setRows(res.content);
      setTotalPages(res.totalPages);
    } catch (e) {
      onNotify({ kind: "err", text: e instanceof Error ? e.message : "Error cargando" });
    } finally {
      setLoading(false);
    }
  }, [q, page, onNotify]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex gap-3 items-end">
        <Input label="Buscar" variant="flat" size="sm" value={q} onValueChange={setQ} className="w-64" placeholder="Empresa o código..." />
        <Button color="primary" variant="bordered" size="md" onPress={() => void load()} isLoading={loading}>Buscar</Button>
      </div>
      <DataTable
        columns={[
          { key: "code", label: "Código" },
          { key: "companyName", label: "Empresa" },
          { key: "discountPercent", label: "Descuento", render: (r) => `${r.discountPercent}%` },
          { key: "flatAmount", label: "Tarifa Fija", render: (r) => r.flatAmount ? `$${r.flatAmount}` : "-" },
          { key: "active", label: "Activo", render: (r) => (r.active ? "Sí" : "No") }
        ]}
        rows={rows as any[]}
      />
    </div>
  );
}

function PrepaidSection({ canEdit, onNotify, auditReason }: { canEdit: boolean; onNotify: (n: { kind: "ok" | "err" | "info"; text: string } | null) => void; auditReason: string; }) {
  const [rows, setRows] = useState<import("@/lib/settings-api").PrepaidPackageRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { fetchPrepaidPackages } = await import("@/lib/settings-api");
      const res = await fetchPrepaidPackages({ size: 50 });
      setRows(res.content);
    } catch (e) {
      onNotify({ kind: "err", text: e instanceof Error ? e.message : "Error cargando" });
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">Paquetes Prepagados</h2>
        <Button color="primary" variant="bordered" size="md" onPress={() => void load()} isLoading={loading}>Actualizar</Button>
      </div>
      <DataTable
        columns={[
          { key: "name", label: "Paquete" },
          { key: "hoursIncluded", label: "Horas" },
          { key: "amount", label: "Precio" },
          { key: "expiresDays", label: "Validez (días)" },
          { key: "active", label: "Activo", render: (r) => (r.active ? "Sí" : "No") }
        ]}
        rows={rows as any[]}
      />
    </div>
  );
}
