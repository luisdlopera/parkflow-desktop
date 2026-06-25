import { apiFetch, apiV1Base, buildApiHeaders } from "./_shared";

function billingBase(): string {
  return `${apiV1Base()}/billing`;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type InvoiceProviderType =
  | "ALEGRA" | "SIIGO" | "FACTURATECH" | "CARVAJAL" | "LOGGRO"
  | "QUICKBOOKS" | "XERO" | "ZOHO" | "STRIPE" | "SAP" | "NETSUITE" | "DYNAMICS" | "ODOO";

export type CountryCode = "CO" | "MX" | "PE" | "CL" | "AR" | "US" | "ES" | "BR";

export type InvoiceStatus =
  | "DRAFT" | "PENDING" | "SENT" | "ACCEPTED" | "PAID" | "REJECTED" | "CANCELLED";

export interface InvoiceProviderConfig {
  id: string;
  providerType: InvoiceProviderType;
  isActive: boolean;
  isDefault: boolean;
  countryCode: CountryCode;
  currency: string;
  resolutionNumber?: string;
  resolutionPrefix?: string;
  resolutionFrom?: number;
  resolutionTo?: number;
  resolutionValidFrom?: string;
  resolutionValidTo?: string;
  taxRegime?: string;
  hasCredentials: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceProviderConfigRequest {
  providerType: InvoiceProviderType;
  isDefault?: boolean;
  countryCode: CountryCode;
  currency: string;
  credentials: Record<string, string>;
  resolutionNumber?: string;
  resolutionPrefix?: string;
  resolutionFrom?: number;
  resolutionTo?: number;
  resolutionValidFrom?: string;
  resolutionValidTo?: string;
  taxRegime?: string;
}

export interface ProviderHealthResult {
  healthy: boolean;
  message: string;
  providerVersion?: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  number: string;
  externalId?: string;
  externalNumber?: string;
  cufe?: string;
  status: InvoiceStatus;
  providerType: InvoiceProviderType;
  clientId?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  countryCode: CountryCode;
  sourceType?: string;
  sourceId?: string;
  dueDate?: string;
  issuedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicePage {
  content: Invoice[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface InvoiceDashboard {
  totalIssued: number;
  pendingDian: number;
  rejected: number;
  cancelled: number;
  totalAmountMonth: number;
  currency: string;
}

export interface InvoiceSyncLog {
  id: string;
  companyId: string;
  invoiceId?: string;
  providerType: InvoiceProviderType;
  eventType: string;
  httpStatus?: number;
  errorMessage?: string;
  durationMs?: number;
  correlationId?: string;
  createdAt: string;
}

export interface InvoiceSyncLogPage {
  content: InvoiceSyncLog[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ─── Provider Config API ─────────────────────────────────────────────────────

export async function fetchBillingProviders(): Promise<InvoiceProviderConfig[]> {
  return apiFetch<InvoiceProviderConfig[]>(`${billingBase()}/providers`, {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function createOrUpdateBillingProvider(
  payload: InvoiceProviderConfigRequest,
): Promise<InvoiceProviderConfig> {
  return apiFetch<InvoiceProviderConfig>(`${billingBase()}/providers`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function testBillingProviderConnection(id: string): Promise<ProviderHealthResult> {
  return apiFetch<ProviderHealthResult>(`${billingBase()}/providers/${id}/test`, {
    method: "POST",
    headers: await buildApiHeaders(),
  });
}

export async function deactivateBillingProvider(id: string): Promise<void> {
  return apiFetch<void>(`${billingBase()}/providers/${id}`, {
    method: "DELETE",
    headers: await buildApiHeaders(),
  });
}

// ─── Invoices API ────────────────────────────────────────────────────────────

export async function fetchBillingDashboard(): Promise<InvoiceDashboard> {
  return apiFetch<InvoiceDashboard>(`${billingBase()}/invoices/dashboard`, {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function fetchInvoices(params: {
  status?: InvoiceStatus;
  clientName?: string;
  page?: number;
  size?: number;
}): Promise<InvoicePage> {
  const u = new URL(`${billingBase()}/invoices`);
  if (params.status) u.searchParams.set("status", params.status);
  if (params.clientName) u.searchParams.set("clientName", params.clientName);
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 20));
  return apiFetch<InvoicePage>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}

export async function getInvoice(id: string): Promise<Invoice> {
  return apiFetch<Invoice>(`${billingBase()}/invoices/${id}`, {
    headers: await buildApiHeaders(),
  });
}

export async function cancelInvoice(id: string, reason: string): Promise<Invoice> {
  return apiFetch<Invoice>(`${billingBase()}/invoices/${id}/cancel`, {
    method: "POST",
    headers: await buildApiHeaders(),
    body: JSON.stringify({ reason }),
  });
}

// ─── Logs API ────────────────────────────────────────────────────────────────

export async function fetchInvoiceLogs(params: {
  page?: number;
  size?: number;
}): Promise<InvoiceSyncLogPage> {
  const u = new URL(`${billingBase()}/logs`);
  u.searchParams.set("page", String(params.page ?? 0));
  u.searchParams.set("size", String(params.size ?? 30));
  return apiFetch<InvoiceSyncLogPage>(u.toString(), {
    cache: "no-store",
    headers: await buildApiHeaders(),
  });
}
