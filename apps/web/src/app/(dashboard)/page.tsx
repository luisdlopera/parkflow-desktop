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

  const base = useCallback(() => {
    const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1/operations";
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
        <h1 className="text-3xl font-semibold text-slate-900">Vision general del parqueadero</h1>
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

      <section className="grid gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Movimientos activos</h2>
          <Badge label="En vivo (API)" tone="success" />
        </div>
        {sessionsError ? <p className="text-sm text-amber-800">{sessionsError}</p> : null}
        <DataTable
          columns={[
            { key: "plate", label: "Placa" },
            { key: "type", label: "Tipo" },
            { key: "started", label: "Ingreso" },
            { key: "status", label: "Estado" },
            { key: "amount", label: "Acumulado" }
          ]}
          rows={sessions}
        />
        {sessions.length === 0 && !sessionsError ? (
          <p className="text-sm text-slate-500">No hay vehiculos activos o aun no hay datos.</p>
        ) : null}
      </section>
    </div>
  );
}
