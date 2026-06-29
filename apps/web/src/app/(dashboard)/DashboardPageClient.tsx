"use client";

import { useCallback, useEffect, useState } from "react";
import { currentUser, canAccessSuperAdminPortal } from "@/lib/services/auth-domain.service";
import { Spinner } from "@heroui/react";
import { Card } from "@/components/bridge/Card";
import { Button } from "@/components/bridge/Button";
import KpiCard, { type KpiCardProps } from "@/components/ui/KpiCard";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/bridge/Badge";
import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";


export default function DashboardPageClient() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  const {
    summary,
    summaryError,
    summaryLoading,
    metrics,
    operational,
    activeSessions,
    sessionsError,
    opsMessage,
    lastUpdated,
    formatLastUpdated,
    refreshAll,
    executeOperationalAction,
  } = useDashboardData();

  useEffect(() => {
    currentUser()
      .then((user) => setIsSuperAdmin(canAccessSuperAdminPortal(user)))
      .catch(() => {});
  }, []);

  const tone = (status?: string) => status === "CRITICAL" ? "text-red-700" : status === "WARNING" ? "text-amber-700" : "text-emerald-700";

  // Build KPI cards with enhanced data
  const kpis: KpiCardProps[] = summary && metrics
    ? [
        {
          title: "Vehiculos activos",
          value: String(summary.activeVehicles),
          trendLabel: "actualmente",
          status: metrics.activeVehicles.status,
        },
        {
          title: "Espacios disponibles",
          value: String(summary.availableSpaces),
          trend: `Cap total: ${summary.totalCapacity}`,
          status: metrics.availableSpaces.status,
        },
        {
          title: "Ocupación actual",
          value: `${Math.round(summary.occupancyPercent)}%`,
          trendValue: summary.occupancyPercent >= 75 ? 5 : -2, // Example trend
          trendLabel: "vs ayer",
          status: metrics.occupancyRate.status,
        },
        {
          title: "Ingresos hoy",
          value: String(summary.entriesSinceMidnight),
          trendValue: 12,
          trendLabel: "vs ayer",
        },
        {
          title: "Salidas hoy",
          value: String(summary.exitsSinceMidnight),
          trendValue: -5,
          trendLabel: "vs ayer",
        },
        {
          title: "Reimpresiones",
          value: String(summary.reprintsSinceMidnight),
          trendLabel: "hoy",
        },
      ]
    : [];

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
      {/* Loading Overlay */}
      {summaryLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-default-900/20 dark:bg-default-100/40 z-50 rounded-3xl">
          <div className="flex flex-col items-center gap-3 bg-default-50 dark:bg-default-100 dark:bg-default-100 rounded-2xl p-8 border border-default-200">
            <Spinner size="lg" color="current" />
            <p className="text-sm font-medium text-default-600 dark:text-default-300">Actualizando datos...</p>
          </div>
        </div>
      )}

      {/* Header Section */}
      <section className="space-y-6" data-testid="summary-loaded">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-default-400 dark:text-default-500 font-bold">Panel principal</p>
            <h1 className="text-2xl sm:text-4xl font-bold text-foreground dark:text-default-200 leading-tight">Vision general del parqueadero</h1>
            {summaryError ? (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{summaryError}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-default-500 dark:text-default-400 whitespace-nowrap">
            <Spinner size="sm" color="current" />
            <span className="font-medium">{formatLastUpdated(lastUpdated)}</span>
          </div>
        </div>

        {/* Status summary grid */}
        {summary ? (
          <div className="rounded-xl border border-default-200 dark:border-default-700 bg-default-50/50 dark:bg-default-100/30 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-default-400 dark:text-default-500 font-semibold mb-1">Sync pendiente</p>
                <p className="text-lg font-bold text-foreground dark:text-default-200">{summary.syncQueuePending}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-default-400 dark:text-default-500 font-semibold mb-1">Impresión fallida</p>
                <p className="text-lg font-bold text-foreground dark:text-default-200">{summary.printFailedSinceMidnight}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-default-400 dark:text-default-500 font-semibold mb-1">Dead letter</p>
                <p className="text-lg font-bold text-foreground dark:text-default-200">{summary.printDeadLetterSinceMidnight}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-default-400 dark:text-default-500 font-semibold mb-1">Tickets perdidos</p>
                <p className="text-lg font-bold text-foreground dark:text-default-200">{summary.lostTicketSinceMidnight}</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Refresh button */}
        <div>
          <Button
            size="sm"
            variant="outline"
            color="default"
            onPress={() => void refreshAll()}
            isLoading={summaryLoading}
            className="hover:scale-105 active:scale-95 transition-transform duration-200"
          >
            Actualizar ahora
          </Button>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

      {/* Operational Health Section (Super Admin Only) */}
      {isSuperAdmin && (
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-foreground dark:text-default-200">Salud Operacional</h2>
            {opsMessage ? <Badge label={opsMessage} tone="warning" /> : null}
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {[
              ["Estado API", operational?.apiStatus],
              ["Base de datos", operational?.databaseStatus],
              ["Impresora", operational?.printerStatus],
              ["Outbox pendiente", String(operational?.outboxPending ?? "—")],
              ["Dead-letter", String(operational?.deadLetter ?? "—")],
            ].map(([label, value]) => {
              const isCritical = String(value) === "CRITICAL";
              const isWarning = String(value) === "WARNING";
              const statusBg = isCritical ? "border-2 border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/40"
                : isWarning ? "border-2 border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40"
                : "border border-default-200 dark:border-default-700";

              return (
                <div key={label} className={`surface rounded-2xl p-5 border transition-all duration-300 hover:border-default-300 dark:hover:border-default-600 ${statusBg}`}>
                  <p className="text-xs font-bold uppercase tracking-wider text-default-400 dark:text-default-500 mb-1">{label}</p>
                  <p className={`text-xl font-bold ${tone(String(value))}`}>{value ?? "—"}</p>
                </div>
              );
            })}
          </div>

          {/* Operational details card */}
          <div className="space-y-4 rounded-2xl border border-default-200 dark:border-default-700 p-6 bg-default-50/50 dark:bg-default-100/30 transition-all duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-default-400 dark:text-default-500">Heartbeat</p>
                <p className="text-sm font-medium text-foreground dark:text-default-200">{operational?.lastHeartbeat ? new Date(operational.lastHeartbeat).toLocaleString("es-CO") : "Sin datos"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-default-400 dark:text-default-500">Último Sync</p>
                <p className="text-sm font-medium text-foreground dark:text-default-200">{operational?.lastSuccessfulSync ? new Date(operational.lastSuccessfulSync).toLocaleString("es-CO") : "Sin datos"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-default-400 dark:text-default-500">Cajas Abiertas</p>
                <p className="text-sm font-medium text-foreground dark:text-default-200">{operational?.openCashRegisters ?? "—"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-default-400 dark:text-default-500">Fallos Detectados</p>
                <p className="text-sm font-medium text-foreground dark:text-default-200">{operational?.failedEvents ?? "—"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" color="default" onPress={() => { executeOperationalAction("retry-sync").catch(() => {}); }} className="hover:scale-105 active:scale-95 transition-transform duration-200">Reintentar Sync</Button>
              <Button size="sm" variant="outline" color="default" onPress={() => { executeOperationalAction("test-printer").catch(() => {}); }} className="hover:scale-105 active:scale-95 transition-transform duration-200">Probar Impresora</Button>
            </div>

            {(operational?.recentErrors?.length ?? 0) > 0 && (
              <div className="pt-4 border-t border-default-200 dark:border-default-700">
                <h3 className="text-sm font-semibold text-foreground dark:text-default-200 mb-3">Errores Recientes</h3>
                <DataTable
                  columns={errorColumns}
                  rows={operational?.recentErrors ?? []}
                  emptyMessage="Sin errores recientes detectados."
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Active Sessions Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground dark:text-default-200">Vehículos en Patio</h2>
            <p className="text-xs text-default-500 dark:text-default-400 mt-1">{activeSessions.length} activos en este momento</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 text-sm font-semibold text-brand-700 dark:text-brand-300">{activeSessions.length}</span>
        </div>
        {sessionsError ? <p className="text-sm text-amber-800 dark:text-amber-200">{sessionsError}</p> : null}
        <DataTable
          columns={[
            { key: "plate", label: "Placa", priority: "high", width: "12%" },
            { key: "type", label: "Tipo", priority: "high", width: "10%" },
            { key: "started", label: "Ingreso", priority: "high", width: "16%", render: (row: any) => row.started ? new Date(row.started).toLocaleTimeString("es-CO") : "—" },
            { key: "elapsedTime", label: "Tiempo", priority: "high", width: "12%", render: (row: any) => {
              if (!row.started) return "—";
              const elapsed = Math.floor((Date.now() - new Date(row.started).getTime()) / 60000);
              const hours = Math.floor(elapsed / 60);
              const mins = elapsed % 60;
              return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            } },
            { key: "section", label: "Sección", priority: "medium", width: "10%" },
            { key: "status", label: "Estado", priority: "high", width: "12%" },
            { key: "amount", label: "Acumulado", priority: "high", width: "12%", align: "right" }
          ]}
          rows={activeSessions}
          emptyMessage="No hay vehículos activos en este momento."
        />
      </section>
    </div>
  );
}
