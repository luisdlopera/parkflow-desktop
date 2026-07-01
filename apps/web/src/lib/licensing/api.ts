import { authHeaders } from "@/lib/services/auth-domain.service";
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
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";

const API_BASE = getApiBase();

const statusMessages: Record<number, string> = {
  400: "Datos inválidos o incompletos. Por favor, revisa la información ingresada.",
  401: "Tu sesión ha expirado o credenciales incorrectas.",
  403: "No tienes permisos para realizar esta acción.",
  404: "El recurso solicitado no existe o fue eliminado.",
  409: "Conflicto con los datos actuales. Es posible que el registro ya exista o haya sido modificado.",
  500: "Ocurrió un error interno en el servidor.",
};

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  
  try {
    const response = await fetchWithCredentials(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const rawText = await response.text();
      let body: Record<string, unknown> = {};
      try { body = rawText ? JSON.parse(rawText) as Record<string, unknown> : {}; } catch { /* ignore */ }
      const status = response.status;
      const userMsg = typeof body.userMessage === "string" ? body.userMessage
        : typeof body.message === "string" ? body.message
        : undefined;
      const msg = userMsg || statusMessages[status] || `No pudimos completar tu solicitud (${status}).`;
      throw new Error(msg);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Sin conexión. Verifica internet o la red local e intenta nuevamente.", { cause: error });
  }
}


// ==================== HEARTBEAT ====================

export async function sendHeartbeat(request: HeartbeatRequest): Promise<HeartbeatResponse> {
  const validatedRequest = validatePayloadOrThrow(licensingHeartbeatRequestSchema, request);
  return apiFetch<HeartbeatResponse>("/licensing/heartbeat", {
    method: "POST",
    body: JSON.stringify(validatedRequest),
  });
}

// ==================== LICENSE VALIDATION ====================

export async function validateLicense(
  request: LicenseValidationRequest
): Promise<LicenseValidationResponse> {
  const validatedRequest = validatePayloadOrThrow(licensingValidateRequestSchema, request);
  return apiFetch<LicenseValidationResponse>("/licensing/validate", {
    method: "POST",
    body: JSON.stringify(validatedRequest),
  });
}

// ==================== COMPANY MANAGEMENT (SUPER ADMIN) ====================

export async function listCompanies(): Promise<Company[]> {
  return apiFetch<Company[]>("/licensing/companies");
}

export async function getCompany(companyId: string): Promise<Company> {
  return apiFetch<Company>(`/licensing/companies/${companyId}`);
}

export async function createCompany(request: CreateCompanyRequest): Promise<Company> {
  const validatedRequest = validatePayloadOrThrow(licensingCreateCompanyRequestSchema, request);
  return apiFetch<Company>("/licensing/companies", {
    method: "POST",
    body: JSON.stringify(validatedRequest),
  });
}

export async function updateCompany(
  companyId: string,
  request: UpdateCompanyRequest
): Promise<Company> {
  const validatedRequest = validatePayloadOrThrow(licensingUpdateCompanyRequestSchema, request);
  return apiFetch<Company>(`/licensing/companies/${companyId}`, {
    method: "PUT",
    body: JSON.stringify(validatedRequest),
  });
}

// ==================== LICENSE MANAGEMENT ====================

export async function generateLicense(
  request: GenerateLicenseRequest
): Promise<GenerateLicenseResponse> {
  const validatedRequest = validatePayloadOrThrow(licensingGenerateLicenseRequestSchema, request);
  return apiFetch<GenerateLicenseResponse>("/licensing/licenses/generate", {
    method: "POST",
    body: JSON.stringify(validatedRequest),
  });
}

export async function renewLicense(
  companyId: string,
  months: number
): Promise<Company> {
  return apiFetch<Company>(`/licensing/companies/${companyId}/renew?months=${months}`, {
    method: "POST",
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
  return apiFetch<void>("/licensing/commands/send", {
    method: "POST",
    body: JSON.stringify(validatedRequest),
  });
}

export async function apiDeactivateCompany(companyId: string): Promise<void> {
  return apiFetch<void>(`/licensing/companies/${companyId}/deactivate`, {
    method: "DELETE",
  });
}

export async function apiDeleteCompany(companyId: string): Promise<void> {
  return apiFetch<void>(`/licensing/companies/${companyId}`, {
    method: "DELETE",
  });
}

export async function apiPurgeCompany(companyId: string): Promise<void> {
  return apiFetch<void>(`/licensing/companies/${companyId}/purge`, {
    method: "DELETE",
  });
}
