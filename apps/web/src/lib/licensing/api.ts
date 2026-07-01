import {
  licensingCreateCompanyRequestSchema,
  licensingGenerateLicenseRequestSchema,
  licensingHeartbeatRequestSchema,
  licensingRemoteCommandRequestSchema,
  licensingUpdateCompanyRequestSchema,
  licensingValidateRequestSchema
} from "@/lib/validation/contracts";
import { validatePayloadOrThrow } from "@/lib/validation/request-guard";
import type {
  HeartbeatRequest,
  HeartbeatResponse,
  LicenseValidationRequest,
  LicenseValidationResponse,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  Company,
  GenerateLicenseRequest,
  GenerateLicenseResponse,
  RemoteCommand,
} from "./types";

import { apiBase as getApiBase } from "@/lib/api/config";
import { apiFetch, buildApiHeaders } from "@/lib/api/_shared";

const API_BASE = getApiBase();

// ==================== HEARTBEAT ====================

export async function sendHeartbeat(request: HeartbeatRequest): Promise<HeartbeatResponse> {
  const validatedRequest = validatePayloadOrThrow(licensingHeartbeatRequestSchema, request);
  return apiFetch<HeartbeatResponse>(`${API_BASE}/licensing/heartbeat`, {
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(validatedRequest),
  });
}

// ==================== LICENSE VALIDATION ====================

export async function validateLicense(
  request: LicenseValidationRequest
): Promise<LicenseValidationResponse> {
  const validatedRequest = validatePayloadOrThrow(licensingValidateRequestSchema, request);
  return apiFetch<LicenseValidationResponse>(`${API_BASE}/licensing/validate`, {
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(validatedRequest),
  });
}

// ==================== COMPANY MANAGEMENT (SUPER ADMIN) ====================

export async function listCompanies(): Promise<Company[]> {
  return apiFetch<Company[]>(`${API_BASE}/licensing/companies`, {
    headers: await buildApiHeaders()
  });
}

export async function getCompany(companyId: string): Promise<Company> {
  return apiFetch<Company>(`${API_BASE}/licensing/companies/${companyId}`, {
    headers: await buildApiHeaders()
  });
}

export async function createCompany(request: CreateCompanyRequest): Promise<Company> {
  const validatedRequest = validatePayloadOrThrow(licensingCreateCompanyRequestSchema, request);
  return apiFetch<Company>(`${API_BASE}/licensing/companies`, {
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(validatedRequest),
  });
}

export async function updateCompany(
  companyId: string,
  request: UpdateCompanyRequest
): Promise<Company> {
  const validatedRequest = validatePayloadOrThrow(licensingUpdateCompanyRequestSchema, request);
  return apiFetch<Company>(`${API_BASE}/licensing/companies/${companyId}`, {
    method: "PUT",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(validatedRequest),
  });
}

// ==================== LICENSE MANAGEMENT ====================

export async function generateLicense(
  request: GenerateLicenseRequest
): Promise<GenerateLicenseResponse> {
  const validatedRequest = validatePayloadOrThrow(licensingGenerateLicenseRequestSchema, request);
  return apiFetch<GenerateLicenseResponse>(`${API_BASE}/licensing/licenses/generate`, {
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(validatedRequest),
  });
}

export async function renewLicense(
  companyId: string,
  months: number
): Promise<Company> {
  return apiFetch<Company>(`${API_BASE}/licensing/companies/${companyId}/renew?months=${months}`, {
    method: "POST",
    headers: await buildApiHeaders()
  });
}

// ==================== REMOTE COMMANDS ====================

export async function sendRemoteCommand(
  deviceId: string,
  command: RemoteCommand,
  payload?: string,
  reason?: string
): Promise<void> {
  const validatedRequest = validatePayloadOrThrow(licensingRemoteCommandRequestSchema, {
    deviceId,
    command,
    payload,
    reason,
  });

  return apiFetch<void>(`${API_BASE}/licensing/commands/send`, {
    method: "POST",
    headers: {
      ...(await buildApiHeaders()),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(validatedRequest),
  });
}

export async function apiDeactivateCompany(companyId: string): Promise<void> {
  return apiFetch<void>(`${API_BASE}/licensing/companies/${companyId}/deactivate`, {
    method: "DELETE",
    headers: await buildApiHeaders()
  });
}

export async function apiDeleteCompany(companyId: string): Promise<void> {
  return apiFetch<void>(`${API_BASE}/licensing/companies/${companyId}`, {
    method: "DELETE",
    headers: await buildApiHeaders()
  });
}

export async function apiPurgeCompany(companyId: string): Promise<void> {
  return apiFetch<void>(`${API_BASE}/licensing/companies/${companyId}/purge`, {
    method: "DELETE",
    headers: await buildApiHeaders()
  });
}
