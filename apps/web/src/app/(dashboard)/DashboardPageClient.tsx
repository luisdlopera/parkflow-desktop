"use client";

import { useCallback, useEffect, useState } from "react";
import { currentUser, canAccessSuperAdminPortal } from "@/features/auth/services/auth-domain.service";
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
      {/* Header Section */}
      <section className="space-y-4" data-testid="summary-loaded">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <p className="text-sm uppercase tracking-[0.3em] text-amber-700/80">Panel principal</p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">Vision general del parqueadero</h1>
            {summaryError ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">{summaryError}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Spinner size="sm" color="current" />
            <span>{formatLastUpdated(lastUpdated)}</span>
          </div>
        </div>

        {/* Status summary bar */}
        {summary ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-3 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p>
              <span className="font-medium">Sync pendiente:</span> {summary.syncQueuePending} ·
              <span className="ml-3 font-medium">Impresión fallida:</span> {summary.printFailedSinceMidnight} ·
              <span className="ml-3 font-medium">Dead letter:</span> {summary.printDeadLetterSinceMidnight} ·
              <span className="ml-3 font-medium">Tickets perdidos:</span> {summary.lostTicketSinceMidnight}
            </p>
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
          >
            Actualizar ahora
          </Button>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

      {/* Operational Health Section (Super Admin Only) */}
      {isSuperAdmin && (
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Salud Operacional</h2>
            {opsMessage ? <Badge label={opsMessage} tone="warning" /> : null}
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              ["Estado API", operational?.apiStatus],
              ["Base de datos", operational?.databaseStatus],
              ["Impresora", operational?.printerStatus],
              ["Outbox pendiente", String(operational?.outboxPending ?? "—")],
              ["Dead-letter", String(operational?.deadLetter ?? "—")],
            ].map(([label, value]) => {
              const isCritical = String(value) === "CRITICAL";
              const isWarning = String(value) === "WARNING";
              const statusBg = isCritical ? "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20"
                : isWarning ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20"
                : "border-slate-200 dark:border-slate-700";

              return (
                <div key={label} className={`surface rounded-2xl p-5 border transition-all ${statusBg}`}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{label}</p>
                  <p className={`text-xl font-bold ${tone(String(value))}`}>{value ?? "—"}</p>
                </div>
              );
            })}
          </div>

          {/* Operational details card */}
          <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-slate-50/30 dark:bg-slate-900/20">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Heartbeat</p>
                <p className="text-slate-900 dark:text-slate-100">{operational?.lastHeartbeat ? new Date(operational.lastHeartbeat).toLocaleString("es-CO") : "Sin datos"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Último Sync</p>
                <p className="text-slate-900 dark:text-slate-100">{operational?.lastSuccessfulSync ? new Date(operational.lastSuccessfulSync).toLocaleString("es-CO") : "Sin datos"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Cajas Abiertas</p>
                <p className="text-slate-900 dark:text-slate-100">{operational?.openCashRegisters ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Fallos Detectados</p>
                <p className="text-slate-900 dark:text-slate-100">{operational?.failedEvents ?? "—"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" color="default" onPress={() => { executeOperationalAction("retry-sync").catch(() => {}); }}>Reintentar Sync</Button>
              <Button size="sm" variant="outline" color="default" onPress={() => { executeOperationalAction("test-printer").catch(() => {}); }}>Probar Impresora</Button>
            </div>

            {(operational?.recentErrors?.length ?? 0) > 0 && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Errores Recientes</h3>
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Vehículos en Patio</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">{activeSessions.length} activos</span>
        </div>
        {sessionsError ? <p className="text-sm text-amber-800 dark:text-amber-200">{sessionsError}</p> : null}
        <DataTable
          columns={[
            { key: "plate", label: "Placa", priority: "high" },
            { key: "type", label: "Tipo", priority: "high" },
            { key: "started", label: "Ingreso", priority: "medium" },
            { key: "status", label: "Estado", priority: "medium" },
            { key: "amount", label: "Acumulado", priority: "high", align: "right" }
          ]}
          rows={activeSessions}
          emptyMessage="No hay vehículos activos en este momento."
        />
      </section>
    </div>
  );
}
