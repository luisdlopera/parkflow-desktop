import { buildApiHeaders } from "@/lib/api";
import { opsBase, apiBase } from "@/lib/api/config";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";


export function getOperationsApiBase(): string {
  return opsBase();
}

export function getCoreApiBase(): string {
  return apiBase();
}

export type ActiveSessionDto = {
  ticketNumber: string;
  plate: string;
  vehicleType: string;
  duration: string;
  rateName: string | null;
  parkingSpaceCode?: string | null;
  parkingSpaceLabel?: string | null;
  custodiedItems?: { identifier: string; observations?: string }[];
};

export type ParkingSummaryDto = {
  availableSpaces: number;
  activeSpaces: number;
};

export type ParkingSpaceDto = {
  id: string;
  code: string;
  label?: string | null;
  type: string;
  status: string;
  occupied: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type GetActiveSessionsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  vehicleType?: string;
};

export async function fetchActiveSessions(params?: GetActiveSessionsQuery): Promise<PaginatedResponse<ActiveSessionDto> | ActiveSessionDto[]> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.limit) queryParams.set("limit", params.limit.toString());
  if (params?.search) queryParams.set("search", params.search);
  if (params?.sortBy) queryParams.set("sortBy", params.sortBy);
  if (params?.sortDir) queryParams.set("sortDir", params.sortDir);
  if (params?.vehicleType && params.vehicleType !== "all") queryParams.set("vehicleType", params.vehicleType);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  const res = await fetchWithCredentials(`${getOperationsApiBase().replace(/\/$/, "")}/sessions/active-list${queryString}`, {
    headers: await buildApiHeaders()
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "No se pudo cargar el listado de vehículos activos");
  }
  return res.json();
}

export async function fetchParkingSummary(): Promise<ParkingSummaryDto> {
  const res = await fetchWithCredentials(`${getCoreApiBase().replace(/\/$/, "")}/parking-spaces/summary`, {
    headers: await buildApiHeaders()
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "No se pudo cargar el resumen de celdas");
  }
  return res.json();
}

export async function fetchParkingSpaces(): Promise<ParkingSpaceDto[]> {
  const res = await fetchWithCredentials(`${getCoreApiBase().replace(/\/$/, "")}/parking-spaces`, {
    headers: await buildApiHeaders()
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.userMessage ?? payload?.error ?? "No se pudieron cargar las celdas de parqueo");
  }
  return res.json();
}
