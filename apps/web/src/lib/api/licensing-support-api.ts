import { authHeaders } from "@/lib/services/auth-domain.service";
import { apiBase as getApiBase } from "./config";
import { apiFetch } from "./_shared";

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
  try {
    return await apiFetch<PriorityCase[]>(`${API_BASE}/licensing/support/cases/priority`, {
      headers: await authHeaders(),
    });
  } catch {
    return [];
  }
}

export async function fetchUnresolvedBlocks(): Promise<BlockEvent[]> {
  try {
    const blocks = await apiFetch<(BlockEvent & { companyName?: string })[]>(`${API_BASE}/licensing/support/blocks/unresolved`, {
      headers: await authHeaders(),
    });
    return blocks.map((b) => ({ ...b, companyName: b.companyName || "Empresa desconocida" }));
  } catch {
    return [];
  }
}

export async function fetchBlockStatistics(days = 7): Promise<BlockStatistics | null> {
  try {
    return await apiFetch<BlockStatistics>(`${API_BASE}/licensing/support/statistics?days=${days}`, {
      headers: await authHeaders(),
    });
  } catch {
    return null;
  }
}

export async function resolveBlock(id: string, notes: string): Promise<void> {
  await apiFetch<void>(`${API_BASE}/licensing/support/blocks/${id}/resolve`, {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({ notes, correctiveAction: "MANUAL_RESOLUTION" }),
  });
}

export async function markBlockFalsePositive(id: string, notes: string): Promise<void> {
  await apiFetch<void>(`${API_BASE}/licensing/support/blocks/${id}/false-positive`, {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
}
