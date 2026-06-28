import type { RateType, VehicleType } from "@/lib/types/parking.types";
import type { UserRole } from "@/lib/types/auth.types";
import type { RateCategory } from "@/lib/api/rates-api";

export const VEHICLE_TYPES: VehicleType[] = ["CAR", "MOTORCYCLE", "BICYCLE", "TRUCK", "BUS", "VAN", "ELECTRIC", "OTHER"];
export const RATE_TYPES: RateType[] = ["PER_MINUTE", "HOURLY", "DAILY", "FLAT"];
export const RATE_TYPE_LABELS: Record<string, string> = {
  PER_MINUTE: "Por minuto",
  HOURLY: "Por hora",
  DAILY: "Diaria",
  FLAT: "Fija"
};
export const RATE_CATEGORIES: RateCategory[] = ["STANDARD", "MONTHLY", "AGREEMENT", "PREPAID"];
export const RATE_CATEGORY_LABELS: Record<string, string> = {
  STANDARD: "Estándar",
  MONTHLY: "Mensualidad",
  AGREEMENT: "Convenio",
  PREPAID: "Prepagado"
};
export const DAYS_OF_WEEK = [
  { label: "Lun", bit: 0 },
  { label: "Mar", bit: 1 },
  { label: "Mié", bit: 2 },
  { label: "Jue", bit: 3 },
  { label: "Vie", bit: 4 },
  { label: "Sáb", bit: 5 },
  { label: "Dom", bit: 6 }
];
export const ROUNDING: Array<"UP" | "DOWN" | "NEAREST"> = ["UP", "DOWN", "NEAREST"];
export const ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "CAJERO", "OPERADOR", "AUDITOR"];
export const LOST_TICKET_POLICIES = [
  { value: "SURCHARGE_RATE", label: "Recargo por tarifa (lostTicketSurcharge)" },
  { value: "BLOCK_EXIT", label: "Bloquear salida sin supervisor" },
  { value: "SUPERVISOR_ONLY", label: "Solo supervisor puede cerrar" }
] as const;

export function toHhMmSs(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const p = t.split(":");
  if (p.length === 2) {
    return `${p[0].padStart(2, "0")}:${p[1].padStart(2, "0")}:00`;
  }
  return t.length === 5 ? `${t}:00` : t;
}

export function toIsoOrNull(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
