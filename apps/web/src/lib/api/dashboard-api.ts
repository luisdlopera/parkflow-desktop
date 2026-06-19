import { buildApiHeaders } from "@/lib/api";
import { opsBase, apiBase } from "@/lib/api/config";

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
  const res = await fetch(`${OPS_BASE}/supervisor/summary`, { headers: await buildApiHeaders() });
  if (!res.ok) throw new Error("No se pudo cargar resumen de supervisor");
  return res.json();
}

export async function fetchOperationalHealth(): Promise<OperationalHealth | null> {
  try {
    const res = await fetch(`${API_BASE}/health/operational`, { headers: await buildApiHeaders() });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export async function fetchActiveSessions(): Promise<ActiveSessionRow[]> {
  const res = await fetch(`${OPS_BASE}/sessions/active-list`, { headers: await buildApiHeaders() });
  if (!res.ok) throw new Error("No se pudo listar sesiones activas");
  const payload = await res.json();
  return Array.isArray(payload) ? payload : (payload.data ?? []);
}

export async function postOperationalAction(path: "retry-sync" | "test-printer"): Promise<string> {
  const res = await fetch(`${API_BASE}/health/operational/${path}`, { method: "POST", headers: await buildApiHeaders() });
  const payload = await res.json();
  return payload.message ?? "Acción ejecutada";
}
