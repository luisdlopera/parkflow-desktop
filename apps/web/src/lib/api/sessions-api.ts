import { buildApiHeaders } from "@/lib/api";
import { opsBase, apiBase } from "@/lib/api/config";
import { apiFetch } from "./_shared";
import type { CursorPaginatedResponse } from "@/lib/types/api.types";


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

export type GetActiveSessionsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  vehicleType?: string;
};

export async function fetchActiveSessions(params?: GetActiveSessionsQuery): Promise<CursorPaginatedResponse<ActiveSessionDto> | ActiveSessionDto[]> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.limit) queryParams.set("limit", params.limit.toString());
  if (params?.search) queryParams.set("search", params.search);
  if (params?.sortBy) queryParams.set("sortBy", params.sortBy);
  if (params?.sortDir) queryParams.set("sortDir", params.sortDir);
  if (params?.vehicleType && params.vehicleType !== "all") queryParams.set("vehicleType", params.vehicleType);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  const payload = await apiFetch<CursorPaginatedResponse<ActiveSessionDto> | ActiveSessionDto[]>(
    `${getOperationsApiBase().replace(/\/$/, "")}/sessions/active-list${queryString}`,
    {
      headers: await buildApiHeaders()
    }
  );
  return payload;
}

export async function fetchParkingSummary(): Promise<ParkingSummaryDto> {
  return apiFetch<ParkingSummaryDto>(`${getCoreApiBase().replace(/\/$/, "")}/parking-spaces/summary`, {
    headers: await buildApiHeaders()
  });
}

export async function fetchParkingSpaces(): Promise<ParkingSpaceDto[]> {
  return apiFetch<ParkingSpaceDto[]>(`${getCoreApiBase().replace(/\/$/, "")}/parking-spaces`, {
    headers: await buildApiHeaders()
  });
}
