"use client";

import { useCallback, useEffect, useState } from "react";
import KpiCard from "@/components/ui/KpiCard";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import { buildApiHeaders } from "@/lib/api";

type Summary = {
  activeVehicles: number;
  entriesSinceMidnight: number;
  exitsSinceMidnight: number;
  reprintsSinceMidnight: number;
  lostTicketSinceMidnight: number;
  printFailedSinceMidnight: number;
  printDeadLetterSinceMidnight: number;
  syncQueuePending: number;
};



type OperationalHealth = {
  overallStatus: "OK" | "WARNING" | "CRITICAL";
  apiStatus: "OK" | "WARNING" | "CRITICAL";
  databaseStatus: "OK" | "WARNING" | "CRITICAL";
  printerStatus: "OK" | "WARNING" | "CRITICAL";
  lastHeartbeat: string | null;
  outboxPending: number;
  failedEvents: number;
  deadLetter: number;
  lastSuccessfulSync: string | null;
  openCashRegisters: number;
  recentErrors: Array<{ source: string; status: string; message: string; occurredAt: string | null }>;
};
type ActiveRow = {
  plate: string;
  type: string;
  started: string;
  status: string;
  amount: string;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ActiveRow[]>([]);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [operational, setOperational] = useState<OperationalHealth | null>(null);
  const [opsMessage, setOpsMessage] = useState<string | null>(null);

  const base = useCallback(() => {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";
    return raw.replace(/\/$/, "");
  }, []);

  const load = useCallback(async () => {
    setSummaryError(null);
    setSessionsError(null);
    try {
      const sRes = await fetch(`${base()}/supervisor/summary`, { headers: await buildApiHeaders() });
      if (!sRes.ok) {
        setSummaryError("No se pudo cargar resumen de supervisor");
        setSummary(null);
      } else {
        setSummary(await sRes.json());
      }
    } catch {
      setSummaryError("API no disponible (resumen)");
      setSummary(null);
    }
    try {
      const opsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1"}/health/operational`, { headers: await buildApiHeaders() });
      setOperational(opsRes.ok ? await opsRes.json() : null);
    } catch {
      setOperational(null);
    }
    try {
      const aRes = await fetch(`${base()}/sessions/active-list`, { headers: await buildApiHeaders() });
      if (!aRes.ok) {
        setSessionsError("No se pudo listar sesiones activas");
        setSessions([]);
        return;
      }
      const list = (await aRes.json()) as Array<{
        ticketNumber: string;
        plate: string;
        vehicleType: string;
        entryAt: string;
        status: string;
        totalAmount: number | null;
      }>;
      setSessions(
        list.map((row) => ({
          plate: row.plate,
          type: row.vehicleType,
          started: row.entryAt
            ? new Date(row.entryAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
            : "—",
          status: row.status === "ACTIVE" ? "Activo" : row.status,
          amount: row.totalAmount != null ? `$ ${Number(row.totalAmount).toLocaleString("es-CO")}` : "—"
        }))
      );
    } catch {
      setSessionsError("API no disponible (sesiones activas)");
      setSessions([]);
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  const callOperationalAction = useCallback(async (path: "retry-sync" | "test-printer") => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1"}/health/operational/${path}`, { method: "POST", headers: await buildApiHeaders() });
    const payload = await res.json();
    setOpsMessage(payload.message ?? "Acción ejecutada");
    await load();
  }, [load]);

  const tone = (status?: string) => status === "CRITICAL" ? "text-red-700" : status === "WARNING" ? "text-amber-700" : "text-emerald-700";

  const kpis = summary
    ? [
        { title: "Vehiculos activos", value: String(summary.activeVehicles), trend: "API" },
        { title: "Ingresos hoy", value: String(summary.entriesSinceMidnight), trend: "Sede" },
        { title: "Salidas hoy", value: String(summary.exitsSinceMidnight), trend: "Sede" },
        { title: "Reimpresiones hoy", value: String(summary.reprintsSinceMidnight), trend: "Sede" }
      ]
    : [
        { title: "Vehiculos activos", value: "—", trend: "…" },
        { title: "Ingresos hoy", value: "—", trend: "…" },
        { title: "Salidas hoy", value: "—", trend: "…" },
        { title: "Reimpresiones hoy", value: "—", trend: "…" }
      ];

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Panel principal</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Vision general del parqueadero</h1>
        {summaryError ? (
          <p className="text-sm text-amber-800">{summaryError}</p>
        ) : null}
        <p className="text-xs text-slate-500">
          {summary
            ? `Sync pendiente: ${summary.syncQueuePending} · Impresion fallida: ${summary.printFailedSinceMidnight} · Dead letter: ${summary.printDeadLetterSinceMidnight} · Tickets perdidos: ${summary.lostTicketSinceMidnight}`
            : null}
        </p>
        <div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Actualizar
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Salud operacional</h2>
        {opsMessage ? <p className="text-sm text-slate-600">{opsMessage}</p> : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ["Estado API", operational?.apiStatus],
            ["Estado base de datos", operational?.databaseStatus],
            ["Estado impresora", operational?.printerStatus],
            ["Outbox pendiente", String(operational?.outboxPending ?? "—")],
            ["Dead-letter", String(operational?.deadLetter ?? "—")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-lg font-semibold ${tone(String(value))}`}>{value ?? "—"}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600">
          Último heartbeat: {operational?.lastHeartbeat ? new Date(operational.lastHeartbeat).toLocaleString("es-CO") : "Sin datos"} · Último sync exitoso: {operational?.lastSuccessfulSync ? new Date(operational.lastSuccessfulSync).toLocaleString("es-CO") : "Sin datos"} · Cajas abiertas: {operational?.openCashRegisters ?? "—"} · Eventos fallidos: {operational?.failedEvents ?? "—"}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => void callOperationalAction("retry-sync")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Reintentar sync</button>
          <button type="button" onClick={() => void callOperationalAction("test-printer")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Probar impresora</button>
        </div>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left"><tr><th className="p-2">Fuente</th><th className="p-2">Estado</th><th className="p-2">Error reciente</th><th className="p-2">Fecha</th></tr></thead>
            <tbody>
              {(operational?.recentErrors ?? []).length === 0 ? (
                <tr><td className="p-2" colSpan={4}>Sin errores recientes.</td></tr>
              ) : (operational?.recentErrors ?? []).map((e, idx) => (
                <tr key={idx} className="border-t"><td className="p-2">{e.source}</td><td className="p-2">{e.status}</td><td className="p-2">{e.message}</td><td className="p-2">{e.occurredAt ? new Date(e.occurredAt).toLocaleString("es-CO") : "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-semibold text-slate-900">Movimientos activos</h2>
          <Badge label="En vivo (API)" tone="success" />
        </div>
        {sessionsError ? <p className="text-sm text-amber-800">{sessionsError}</p> : null}
        <DataTable
          columns={[
            { key: "plate", label: "Placa", priority: "high" },
            { key: "type", label: "Tipo", priority: "high" },
            { key: "started", label: "Ingreso", priority: "medium" },
            { key: "status", label: "Estado", priority: "medium" },
            { key: "amount", label: "Acumulado", priority: "high" }
          ]}
          rows={sessions}
          emptyMessage="No hay vehiculos activos o aun no hay datos."
        />
      </section>
    </div>
  );
}
