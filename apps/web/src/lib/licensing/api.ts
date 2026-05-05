import { authHeaders } from "@/lib/auth";
import { normalizeApiError, handleNetworkError } from "@/lib/errors/normalize-api-error";
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw await normalizeApiError(response);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "ApiError") {
      throw error;
    }
    throw handleNetworkError(error);
  }
}


// ==================== HEARTBEAT ====================

export async function sendHeartbeat(request: HeartbeatRequest): Promise<HeartbeatResponse> {
  return apiFetch<HeartbeatResponse>("/licensing/heartbeat", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// ==================== LICENSE VALIDATION ====================

export async function validateLicense(
  request: LicenseValidationRequest
): Promise<LicenseValidationResponse> {
  return apiFetch<LicenseValidationResponse>("/licensing/validate", {
    method: "POST",
    body: JSON.stringify(request),
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
  return apiFetch<Company>("/licensing/companies", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function updateCompany(
  companyId: string,
  request: UpdateCompanyRequest
): Promise<Company> {
  return apiFetch<Company>(`/licensing/companies/${companyId}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

// ==================== LICENSE MANAGEMENT ====================

export async function generateLicense(
  request: GenerateLicenseRequest
): Promise<GenerateLicenseResponse> {
  return apiFetch<GenerateLicenseResponse>("/licensing/licenses/generate", {
    method: "POST",
    body: JSON.stringify(request),
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
  return apiFetch<void>("/licensing/commands/send", {
    method: "POST",
    body: JSON.stringify({
      deviceId,
      command,
      payload,
      reason,
    }),
  });
}
