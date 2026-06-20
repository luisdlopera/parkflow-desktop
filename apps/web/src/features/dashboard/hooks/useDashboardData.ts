import useSWR from "swr";
import { fetchDashboardSummary, fetchOperationalHealth, fetchActiveSessions, postOperationalAction, type DashboardSummary, type OperationalHealth, type ActiveSessionRow } from "@/lib/api/dashboard-api";
import { useCallback, useState, useEffect } from "react";

export interface DashboardMetrics {
  activeVehicles: { value: number; trend?: number; status: "ok" | "warning" | "critical" };
  availableSpaces: { value: number; trend?: number; status: "ok" | "warning" | "critical" };
  occupancyRate: { value: number; trend?: number; status: "ok" | "warning" | "critical" };
  entriesTotal: { value: number; trend?: number };
  exitsTotal: { value: number; trend?: number };
  reprintsTotal: { value: number; trend?: number };
}

export function useDashboardData() {
  const [opsMessage, setOpsMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const {
    data: summary,
    error: summaryError,
    mutate: mutateSummary,
    isLoading: summaryLoading,
  } = useSWR<DashboardSummary>("dashboard-summary", fetchDashboardSummary, {
    refreshInterval: 30000,
    revalidateOnFocus: false,
  });

  const {
    data: operational,
    error: operationalError,
    mutate: mutateOperational,
  } = useSWR<OperationalHealth | null>("dashboard-operational", fetchOperationalHealth, {
    refreshInterval: 60000,
    revalidateOnFocus: false,
  });

  const {
    data: activeSessionsRaw,
    error: sessionsError,
    mutate: mutateSessions,
  } = useSWR<ActiveSessionRow[]>("dashboard-active-sessions", fetchActiveSessions, {
    refreshInterval: 15000,
    revalidateOnFocus: false,
  });

  // Update timestamp when data changes
  useEffect(() => {
    if (summary || operational || activeSessionsRaw) {
      setLastUpdated(new Date());
    }
  }, [summary, operational, activeSessionsRaw]);

  const activeSessions = activeSessionsRaw?.map((row) => ({
    plate: row.plate,
    type: row.vehicleType,
    started: row.entryAt ? new Date(row.entryAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "—",
    status: row.status === "ACTIVE" ? "Activo" : row.status,
    amount: row.totalAmount != null ? `$ ${Number(row.totalAmount).toLocaleString("es-CO")}` : "—",
  })) ?? [];

  // Determine status based on occupancy and vehicle counts
  const determineStatus = (occupancyPercent?: number, activeVehicles?: number) => {
    if (!occupancyPercent) return "ok";
    if (occupancyPercent >= 90) return "critical";
    if (occupancyPercent >= 75) return "warning";
    return "ok";
  };

  const metrics: DashboardMetrics | null = summary ? {
    activeVehicles: {
      value: summary.activeVehicles,
      trend: 0, // Would come from comparison endpoint if available
      status: summary.activeVehicles > 0 ? "ok" : "ok",
    },
    availableSpaces: {
      value: summary.availableSpaces,
      trend: 0,
      status: summary.availableSpaces === 0 ? "critical" : summary.availableSpaces < 5 ? "warning" : "ok",
    },
    occupancyRate: {
      value: Math.round(summary.occupancyPercent),
      trend: 0,
      status: determineStatus(summary.occupancyPercent),
    },
    entriesTotal: {
      value: summary.entriesSinceMidnight,
      trend: 0,
    },
    exitsTotal: {
      value: summary.exitsSinceMidnight,
      trend: 0,
    },
    reprintsTotal: {
      value: summary.reprintsSinceMidnight,
      trend: 0,
    },
  } : null;

  const refreshAll = useCallback(async () => {
    await Promise.all([
      mutateSummary(),
      mutateOperational(),
      mutateSessions(),
    ]);
  }, [mutateSummary, mutateOperational, mutateSessions]);

  const executeOperationalAction = useCallback(async (path: "retry-sync" | "test-printer") => {
    try {
      const msg = await postOperationalAction(path);
      setOpsMessage(msg);
    } catch {
      setOpsMessage("Error al ejecutar acción");
    }
    await refreshAll();
  }, [refreshAll]);

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return "Hace unos segundos";
    if (diffSecs < 120) return "Hace 1 minuto";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `Hace ${diffMins} minutos`;
    return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  };

  return {
    summary: summary ?? null,
    summaryError: summaryError ? "API no disponible (resumen)" : null,
    summaryLoading,
    metrics,
    operational: operational ?? null,
    operationalError: operationalError ? "API no disponible (operacional)" : null,
    activeSessions,
    sessionsError: sessionsError ? "API no disponible (sesiones activas)" : null,
    opsMessage,
    lastUpdated,
    formatLastUpdated,
    refreshAll,
    executeOperationalAction,
  };
}
