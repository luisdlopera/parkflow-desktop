import { describe, it, expect, vi, beforeEach } from "vitest";
import { queueOfflineOperation } from "@/lib/offline-outbox";

vi.mock("@/lib/services/auth-domain.service", () => ({
  isOfflineLeaseValid: vi.fn(),
}));

vi.mock("@/lib/services/auth-storage.service", () => ({
  loadSession: vi.fn(),
}));

const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

describe("offline-outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__TAURI_INTERNALS__ = {};
  });

  it("returns false when session is null", async () => {
    const { isOfflineLeaseValid } = await import("@/lib/services/auth-domain.service");
    const { loadSession } = await import("@/lib/services/auth-storage.service");

    vi.mocked(isOfflineLeaseValid).mockResolvedValue(true);
    vi.mocked(loadSession).mockResolvedValue(null);

    const result = await queueOfflineOperation("ENTRY_RECORDED", { plate: "ABC123" });
    expect(result).toBe(false);
  });

  it("throws when Tauri invoke fails", async () => {
    const { isOfflineLeaseValid } = await import("@/lib/services/auth-domain.service");
    const { loadSession } = await import("@/lib/services/auth-storage.service");

    vi.mocked(isOfflineLeaseValid).mockResolvedValue(true);
    vi.mocked(loadSession).mockResolvedValue({
      user: { id: "user-1" },
      session: { deviceId: "device-1", sessionId: "session-1" },
    } as any);
    mockInvoke.mockRejectedValue(new Error("Tauri invoke error"));

    await expect(
      queueOfflineOperation("ENTRY_RECORDED", { plate: "ABC123" }),
    ).rejects.toThrow("Tauri invoke error");
  });

  it("sets correct event type, origin, and payload for LOST_TICKET", async () => {
    const { isOfflineLeaseValid } = await import("@/lib/services/auth-domain.service");
    const { loadSession } = await import("@/lib/services/auth-storage.service");

    vi.mocked(isOfflineLeaseValid).mockResolvedValue(true);
    vi.mocked(loadSession).mockResolvedValue({
      user: { id: "user-1" },
      session: { deviceId: "device-1", sessionId: "session-1" },
    } as any);
    mockInvoke.mockResolvedValue(undefined);

    const result = await queueOfflineOperation("LOST_TICKET", { ticketId: "T-123" });

    expect(result).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith("enqueue_outbox_event", {
      request: expect.objectContaining({
        event_type: "LOST_TICKET",
        origin: "OFFLINE_PENDING_SYNC",
        user_id: "user-1",
        device_id: "device-1",
        auth_session_id: "session-1",
        payload_json: JSON.stringify({ ticketId: "T-123" }),
      }),
    });
  });
});
