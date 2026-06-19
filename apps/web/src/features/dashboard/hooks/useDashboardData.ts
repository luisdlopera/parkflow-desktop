import useSWR from "swr";
import { fetchDashboardSummary, fetchOperationalHealth, fetchActiveSessions, postOperationalAction, type DashboardSummary, type OperationalHealth, type ActiveSessionRow } from "@/lib/api/dashboard-api";
import { useCallback, useState } from "react";

export function useDashboardData() {
  const [opsMessage, setOpsMessage] = useState<string | null>(null);

  const {
    data: summary,
    error: summaryError,
    mutate: mutateSummary,
  } = useSWR<DashboardSummary>("dashboard-summary", fetchDashboardSummary, {
    refreshInterval: 30000,
  });

  const {
    data: operational,
    error: operationalError,
    mutate: mutateOperational,
  } = useSWR<OperationalHealth | null>("dashboard-operational", fetchOperationalHealth, {
    refreshInterval: 60000,
  });

  const {
    data: activeSessionsRaw,
    error: sessionsError,
    mutate: mutateSessions,
  } = useSWR<ActiveSessionRow[]>("dashboard-active-sessions", fetchActiveSessions, {
    refreshInterval: 15000,
  });

  const activeSessions = activeSessionsRaw?.map((row) => ({
    plate: row.plate,
    type: row.vehicleType,
    started: row.entryAt ? new Date(row.entryAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "—",
    status: row.status === "ACTIVE" ? "Activo" : row.status,
    amount: row.totalAmount != null ? `$ ${Number(row.totalAmount).toLocaleString("es-CO")}` : "—",
  })) ?? [];

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

  return {
    summary: summary ?? null,
    summaryError: summaryError ? "API no disponible (resumen)" : null,
    operational: operational ?? null,
    operationalError: operationalError ? "API no disponible (operacional)" : null,
    activeSessions,
    sessionsError: sessionsError ? "API no disponible (sesiones activas)" : null,
    opsMessage,
    refreshAll,
    executeOperationalAction,
  };
}
