"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, CardBody, Divider } from "@heroui/react";
import KpiCard from "@/components/ui/KpiCard";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import { buildApiHeaders } from "@/lib/api";
import LocalPrintAgentStatus from "@/components/print/LocalPrintAgentStatus";
import { PrintStatusMonitor } from "@/components/print/PrintStatusMonitor";

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

  const errorColumns = [
    { key: "source", label: "Fuente" },
    { key: "status", label: "Estado" },
    { key: "message", label: "Error reciente" },
    { 
      key: "occurredAt", 
      label: "Fecha",
      render: (row: any) => row.occurredAt ? new Date(row.occurredAt).toLocaleString("es-CO") : "—"
    }
  ];

  return (
    <div className="space-y-10" data-testid="dashboard-root">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Panel principal</p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">Visión general</h1>
          {summaryError ? (
            <p className="text-sm text-amber-800 font-medium">{summaryError}</p>
          ) : null}
          <p className="text-xs text-slate-500 font-medium">
            {summary
              ? `Sync pendiente: ${summary.syncQueuePending} · Impresión fallida: ${summary.printFailedSinceMidnight} · Dead letter: ${summary.printDeadLetterSinceMidnight} · Tickets perdidos: ${summary.lostTicketSinceMidnight}`
              : null}
          </p>
        </div>
        <Button
          variant="flat"
          color="primary"
          size="sm"
          onPress={() => void load()}
          className="font-semibold"
        >
          Actualizar datos
        </Button>
      </section>

      <section className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <PrintStatusMonitor />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <LocalPrintAgentStatus />
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-600">Caja 01</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Salud Operacional</h2>
          {opsMessage ? <Badge label={opsMessage} tone="warning" /> : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ["Estado API", operational?.apiStatus],
            ["Estado base de datos", operational?.databaseStatus],
            ["Estado impresora", operational?.printerStatus],
            ["Outbox pendiente", String(operational?.outboxPending ?? "—")],
            ["Dead-letter", String(operational?.deadLetter ?? "—")],
          ].map(([label, value]) => (
            <div key={label} className="surface rounded-2xl p-5 border border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
              <p className={`text-xl font-bold ${tone(String(value))}`}>{value ?? "—"}</p>
            </div>
          ))}
        </div>

        <div className="surface rounded-2xl p-6 border border-slate-100">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 mb-6">
            <p><span className="text-slate-400">Heartbeat:</span> {operational?.lastHeartbeat ? new Date(operational.lastHeartbeat).toLocaleString("es-CO") : "Sin datos"}</p>
            <p><span className="text-slate-400">Último Sync:</span> {operational?.lastSuccessfulSync ? new Date(operational.lastSuccessfulSync).toLocaleString("es-CO") : "Sin datos"}</p>
            <p><span className="text-slate-400">Cajas:</span> {operational?.openCashRegisters ?? "—"}</p>
            <p><span className="text-slate-400">Fallos:</span> {operational?.failedEvents ?? "—"}</p>
          </div>

          <div className="flex gap-3 mb-6">
            <Button size="sm" variant="flat" color="primary" onPress={() => void callOperationalAction("retry-sync")}>Reintentar Sync</Button>
            <Button size="sm" variant="flat" color="primary" onPress={() => void callOperationalAction("test-printer")}>Probar Impresora</Button>
          </div>

          <DataTable
            columns={errorColumns}
            rows={operational?.recentErrors ?? []}
            emptyMessage="Sin errores recientes detectados."
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Vehículos en Patio</h2>
          <Badge label="En vivo" tone="success" />
        </div>
        {sessionsError ? <p className="text-sm text-amber-800">{sessionsError}</p> : null}
        <DataTable
          columns={[
            { key: "plate", label: "Placa", priority: "high" },
            { key: "type", label: "Tipo", priority: "high" },
            { key: "started", label: "Ingreso", priority: "medium" },
            { key: "status", label: "Estado", priority: "medium" },
            { key: "amount", label: "Acumulado", priority: "high", align: "right" }
          ]}
          rows={sessions}
          emptyMessage="No hay vehículos activos en este momento."
        />
      </section>
    </div>
  );
}
