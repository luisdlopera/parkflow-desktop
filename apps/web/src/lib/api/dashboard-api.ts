import { buildApiHeaders } from "@/lib/api";
import { opsBase, apiBase } from "@/lib/api/config";
import { apiFetch } from "./_shared";
import { normalizeCursorPage } from "./pagination";
import type { CursorPaginatedResponse } from "@/lib/types/api.types";


const OPS_BASE = opsBase();
const API_BASE = apiBase();

export interface DashboardSummary {
  activeVehicles: number;
  totalCapacity: number;
  availableSpaces: number;
  occupancyPercent: number;
  entriesSinceMidnight: number;
  exitsSinceMidnight: number;
  reprintsSinceMidnight: number;
  lostTicketSinceMidnight: number;
  printFailedSinceMidnight: number;
  printDeadLetterSinceMidnight: number;
  syncQueuePending: number;
}

export interface OperationalHealth {
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
}

export interface ActiveSessionRow {
  ticketNumber: string;
  plate: string;
  vehicleType: string;
  entryAt: string;
  status: string;
  totalAmount: number | null;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>(`${OPS_BASE}/supervisor/summary`, { headers: await buildApiHeaders() });
}

export async function fetchOperationalHealth(): Promise<OperationalHealth | null> {
  try {
    return await apiFetch<OperationalHealth>(`${API_BASE}/health/operational`, { headers: await buildApiHeaders() });
  } catch {
    return null;
  }
}

export async function fetchActiveSessions(): Promise<CursorPaginatedResponse<ActiveSessionRow>> {
  const payload = await apiFetch<ActiveSessionRow[] | { data?: ActiveSessionRow[] }>(`${OPS_BASE}/sessions/active-list`, {
    headers: await buildApiHeaders()
  });
  return normalizeCursorPage(payload);
}

export async function postOperationalAction(path: "retry-sync" | "test-printer"): Promise<string> {
  const payload = await apiFetch<{ message?: string }>(`${API_BASE}/health/operational/${path}`, {
    method: "POST",
    headers: await buildApiHeaders()
  });
  return payload.message ?? "Acción ejecutada";
}
