import { buildApiHeaders } from "@/lib/api";
import { apiBase } from "@/lib/api/config";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";


const API_BASE = apiBase();

export type ReportView =
  | "daily-operations"
  | "cash-session"
  | "vehicle-type"
  | "paid-tickets"
  | "voided-tickets"
  | "income-expense"
  | "occupancy"
  | "by-operator"
  | "by-payment-method";

export type DailyOpsRow = { date: string; entries: number; exits: number; lostTickets: number; cashTotal: number; cardTotal: number; transferTotal: number; otherTotal: number; grandTotal: number };
export type CashSessionRow = { id: string; openedAt: string; closedAt: string | null; operatorName: string | null; status: string; openingAmount: number; expectedAmount: number; countedAmount: number | null; difference: number | null; movementCount: number };
export type PaginatedResponse<T> = { content: T[]; totalElements: number; totalPages: number; number: number; size: number };
export type CashSummary = { openingAmount: number; expectedLedgerTotal: number; countedTotal: number | null; difference: number | null; totalsByPaymentMethod: Record<string, number>; totalsByMovementType: Record<string, number>; movementCount: number } | null;
export type VehicleTypeRow = { vehicleType: string; activeCount: number; entriesToday: number; exitsToday: number; revenueToday: number };
export type PaidTicketRow = { ticketNumber: string; plate: string; vehicleType: string; amount: number; paymentMethod: string; paidAt: string; entryAt: string };
export type VoidedTicketRow = { id: string; movementType: string; displayName: string; paymentMethod: string; amount: number; reason: string | null; voidReason: string | null; voidedByName: string | null; voidedAt: string; createdAt: string; cashSessionId: string };
export type IncomeExpense = { incomeTotal: number; expenseTotal: number; netTotal: number; breakdown: { movementType: string; displayName: string; amount: number; count: number }[] };
export type Occupancy = { totalSpaces: number; occupiedSpaces: number; availableSpaces: number; occupancyPercentage: number; byVehicleType: { vehicleType: string; occupied: number }[] };
export type OperatorRow = { operatorId: string; operatorName: string; transactionCount: number; totalAmount: number; cashAmount: number; cardAmount: number; transferAmount: number; otherAmount: number };
export type PaymentMethodRow = { paymentMethod: string; displayName: string; transactionCount: number; totalAmount: number; percentage: number };

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetchWithCredentials(`${API_BASE}${path}`, { headers: await buildApiHeaders() });
  if (!res.ok) throw new Error((await res.json()).error ?? `Error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchDailyOperations(dateFrom: string, dateTo: string): Promise<DailyOpsRow[]> {
  const p = new URLSearchParams();
  if (dateFrom) p.set("dateFrom", dateFrom);
  if (dateTo) p.set("dateTo", dateTo);
  return fetchJson<DailyOpsRow[]>(`/reports/daily-operations?${p.toString()}`);
}

export async function fetchCashSessionHistory(
  dateFrom: string,
  dateTo: string,
  page = 0,
  size = 20,
): Promise<PaginatedResponse<CashSessionRow>> {
  const p = new URLSearchParams({ dateFrom, dateTo, page: String(page), size: String(size) });
  return fetchJson<PaginatedResponse<CashSessionRow>>(`/reports/cash-session-history?${p.toString()}`);
}

export async function fetchCashSessionSummary(sessionId: string): Promise<CashSummary> {
  return fetchJson<CashSummary>(`/reports/cash-session-summary?sessionId=${sessionId}`);
}

export async function fetchVehicleTypeReport(): Promise<VehicleTypeRow[]> {
  return fetchJson<VehicleTypeRow[]>("/reports/vehicle-type");
}

export async function fetchPaidTickets(
  dateFrom: string,
  dateTo: string,
  page = 0,
  size = 50,
): Promise<PaginatedResponse<PaidTicketRow>> {
  const p = new URLSearchParams();
  if (dateFrom) p.set("dateFrom", dateFrom);
  if (dateTo) p.set("dateTo", dateTo);
  p.set("page", String(page));
  p.set("size", String(size));
  return fetchJson<PaginatedResponse<PaidTicketRow>>(`/reports/paid-tickets?${p.toString()}`);
}

export async function fetchVoidedTickets(dateFrom: string, dateTo: string): Promise<VoidedTicketRow[]> {
  const p = new URLSearchParams();
  if (dateFrom) p.set("dateFrom", dateFrom);
  if (dateTo) p.set("dateTo", dateTo);
  return fetchJson<VoidedTicketRow[]>(`/reports/voided-tickets?${p.toString()}`);
}

export async function fetchIncomeExpense(dateFrom: string, dateTo: string): Promise<IncomeExpense> {
  const p = new URLSearchParams();
  if (dateFrom) p.set("dateFrom", dateFrom);
  if (dateTo) p.set("dateTo", dateTo);
  return fetchJson<IncomeExpense>(`/reports/income-expense?${p.toString()}`);
}

export async function fetchOccupancy(): Promise<Occupancy> {
  return fetchJson<Occupancy>("/reports/occupancy");
}

export async function fetchByOperator(dateFrom: string, dateTo: string): Promise<OperatorRow[]> {
  const p = new URLSearchParams();
  if (dateFrom) p.set("dateFrom", dateFrom);
  if (dateTo) p.set("dateTo", dateTo);
  return fetchJson<OperatorRow[]>(`/reports/by-operator?${p.toString()}`);
}

export async function fetchByPaymentMethod(dateFrom: string, dateTo: string): Promise<PaymentMethodRow[]> {
  const p = new URLSearchParams();
  if (dateFrom) p.set("dateFrom", dateFrom);
  if (dateTo) p.set("dateTo", dateTo);
  return fetchJson<PaymentMethodRow[]>(`/reports/by-payment-method?${p.toString()}`);
}
