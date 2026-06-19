import { authHeaders } from "@/features/auth/services/auth-domain.service";
import { apiBase as getApiBase } from "./config";
const API_BASE = getApiBase();

export interface PriorityCase {
  companyId: string;
  companyName: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  issueType: string;
  description: string;
  affectedDevices: number;
  lastIncidentAt: string;
  recommendedAction: string;
}

export interface BlockEvent {
  id: string;
  companyId: string;
  companyName: string;
  eventType: string;
  reasonCode: string;
  reasonDescription: string;
  createdAt: string;
  resolved: boolean;
  falsePositive: boolean;
}

export interface BlockStatistics {
  totalBlocks: number;
  resolvedBlocks: number;
  falsePositives: number;
  unresolvedBlocks: number;
  blocksByReason: Record<string, number>;
  blocksByDay: Array<{ date: string; count: number }>;
  averageResolutionTimeMinutes: number;
}

export async function fetchPriorityCases(): Promise<PriorityCase[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/licensing/support/cases/priority`, { headers });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchUnresolvedBlocks(): Promise<BlockEvent[]> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/licensing/support/blocks/unresolved`, { headers });
  if (!res.ok) return [];
  const blocks: (BlockEvent & { companyName?: string })[] = await res.json();
  return blocks.map((b) => ({ ...b, companyName: b.companyName || "Empresa desconocida" }));
}

export async function fetchBlockStatistics(days = 7): Promise<BlockStatistics | null> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/licensing/support/statistics?days=${days}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function resolveBlock(id: string, notes: string): Promise<void> {
  const headers = await authHeaders();
  await fetch(`${API_BASE}/licensing/support/blocks/${id}/resolve`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ notes, correctiveAction: "MANUAL_RESOLUTION" }),
  });
}

export async function markBlockFalsePositive(id: string, notes: string): Promise<void> {
  const headers = await authHeaders();
  await fetch(`${API_BASE}/licensing/support/blocks/${id}/false-positive`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
}
