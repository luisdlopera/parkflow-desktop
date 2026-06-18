"use client";
import { ListBox } from "@heroui/react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useDialog } from "@/components/ui/DialogProvider";
import DataTable from "@/components/ui/DataTable";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchRates,
  fetchRateById,
  deleteRate,
  patchRateStatus,
  type RateRow
} from "@/lib/settings-api";
import type { RateType } from "@/modules/parking/types";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { getUserFriendlyErrorMessage, FrontendActionError } from "@/lib/errors/error-messages";
import { RATE_CATEGORIES, RATE_CATEGORY_LABELS } from "@/features/configuration/constants";
import { RateForm } from "./RateForm";

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
