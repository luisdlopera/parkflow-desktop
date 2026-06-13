import { buildApiHeaders } from "@/lib/api";

export function getOperationsApiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:6011/api/v1/operations";
}

export function getCoreApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";
}

export type ActiveSessionDto = {
  ticketNumber: string;
  plate: string;
  vehicleType: string;
  duration: string;
  rateName: string | null;
  parkingSpaceCode?: string | null;
  parkingSpaceLabel?: string | null;
};

export type ParkingSummaryDto = {
  availableSpaces: number;
  activeSpaces: number;
};

export async function fetchActiveSessions(): Promise<ActiveSessionDto[]> {
  const res = await fetch(`${getOperationsApiBase().replace(/\/$/, "")}/sessions/active-list`, {
    headers: await buildApiHeaders()
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? "No se pudo cargar el listado de vehículos activos");
  }
  return res.json();
}

export async function fetchParkingSummary(): Promise<ParkingSummaryDto> {
  const res = await fetch(`${getCoreApiBase().replace(/\/$/, "")}/parking-spaces/summary`, {
    headers: await buildApiHeaders()
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? "No se pudo cargar el resumen de celdas");
  }
  return res.json();
}
