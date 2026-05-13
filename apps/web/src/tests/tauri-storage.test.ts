import { beforeEach, describe, expect, it } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";

import { TauriStorage } from "@/lib/storage/tauri-storage";

describe("TauriStorage", () => {
  beforeEach(() => {
    clearMocks();
  });

  it("maps outbox enqueue payloads to Rust commands", async () => {
    const storage = new TauriStorage();

    mockIPC((cmd, args) => {
      if (cmd === "enqueue_outbox_event") {
        expect(args).toMatchObject({
          request: {
            idempotency_key: "idem-1",
            event_type: "ENTRY_RECORDED",
            payload_json: JSON.stringify({ plate: "ABC123" }),
            origin: "ONLINE",
            user_id: "user-1",
            device_id: "device-1",
            auth_session_id: "session-1",
          },
        });
        return { id: 42 };
      }
    });

    await expect(
      storage.outboxEnqueue({
        idempotencyKey: "idem-1",
        eventType: "ENTRY_RECORDED",
        payload: { plate: "ABC123" },
        origin: "ONLINE",
        userId: "user-1",
        deviceId: "device-1",
        authSessionId: "session-1",
      })
    ).resolves.toBe("42");
  });

  it("claims print jobs and updates print status", async () => {
    const storage = new TauriStorage();

    mockIPC((cmd, args) => {
      if (cmd === "list_print_jobs") {
        return [
          {
            id: "job-1",
            document_type: "ENTRY",
            idempotency_key: "idem-1",
            status: "pending",
            attempts: 11,
          },
        ];
      }

      if (cmd === "update_print_job_status") {
        expect(args).toMatchObject({
          request: {
            job_id: "job-1",
            status: "DeadLetter",
            message: "printer failed",
            attempt_key: null,
          },
        });
        return null;
      }
    });

    await expect(storage.printClaimNext()).resolves.toMatchObject({
      id: "job-1",
      status: "pending",
      attempts: 11,
    });

    await expect(storage.printMarkRetryOrDead("job-1", "printer failed")).resolves.toBeUndefined();
  });

  it("exposes connectivity state mapping", async () => {
    const storage = new TauriStorage();

    mockIPC((cmd) => {
      if (cmd === "get_connectivity_state") {
        return {
          is_online: true,
          last_checked_at_unix_ms: 123,
          last_error: null,
        };
      }
    });

    await expect(storage.getConnectivityState()).resolves.toEqual({
      isOnline: true,
      lastChecked: 123,
      lastError: null,
    });
  });
});
