import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { PrintAgentState } from "../state-store.js";

describe("PrintAgentState", () => {
  let tmpDir: string;
  let state: PrintAgentState;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "print-agent-test-"));
    state = new PrintAgentState(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("starts with empty state", () => {
    expect(state.getById("any")).toBeNull();
    expect(state.getByIdempotency("any")).toBeNull();
  });

  it("persists and loads a job", () => {
    const now = new Date().toISOString();
    state.upsertJob("key-1", {
      id: "job-1",
      idempotencyKey: "key-1",
      ticketId: "ticket-1",
      documentType: "ENTRY",
      status: "processing",
      createdAtIso: now,
      updatedAtIso: now,
      lastError: null,
      attemptCount: 1,
      result: null,
    });

    const loaded = new PrintAgentState(tmpDir);
    loaded.load();
    expect(loaded.getByIdempotency("key-1")).not.toBeNull();
    expect(loaded.getByIdempotency("key-1")!.id).toBe("job-1");
    expect(loaded.getById("job-1")).not.toBeNull();
  });

  it("updates existing job by idempotency key", () => {
    const now = new Date().toISOString();
    state.upsertJob("key-1", {
      id: "job-1",
      idempotencyKey: "key-1",
      ticketId: "ticket-1",
      documentType: "ENTRY",
      status: "processing",
      createdAtIso: now,
      updatedAtIso: now,
      lastError: null,
      attemptCount: 1,
      result: null,
    });
    state.upsertJob("key-1", {
      id: "job-1",
      idempotencyKey: "key-1",
      ticketId: "ticket-1",
      documentType: "ENTRY",
      status: "acked",
      createdAtIso: now,
      updatedAtIso: new Date().toISOString(),
      lastError: null,
      attemptCount: 1,
      result: { jobId: "job-1", status: "acked", message: "OK", printedAtIso: new Date().toISOString(), hardwareConfirmed: true },
    });

    expect(state.getByIdempotency("key-1")!.status).toBe("acked");
    expect(state.getByIdempotency("key-1")!.result).not.toBeNull();
  });

  it("returns null for unknown idempotency key", () => {
    expect(state.getByIdempotency("nonexistent")).toBeNull();
  });

  it("returns null for unknown id", () => {
    expect(state.getById("nonexistent")).toBeNull();
  });

  it("limits jobs to MAX_JOBS", () => {
    const now = new Date().toISOString();
    for (let i = 0; i < 2_050; i++) {
      state.upsertJob(`key-${i}`, {
        id: `job-${i}`,
        idempotencyKey: `key-${i}`,
        ticketId: `ticket-${i}`,
        documentType: "ENTRY",
        status: "sent",
        createdAtIso: now,
        updatedAtIso: now,
        lastError: null,
        attemptCount: 1,
        result: null,
      });
    }
    const reloaded = new PrintAgentState(tmpDir);
    reloaded.load();
    expect(reloaded.getByIdempotency("key-2049")).not.toBeNull();
    expect(reloaded.getByIdempotency("key-0")).toBeNull();
  });

  it("toView returns correct shape", () => {
    const now = new Date().toISOString();
    state.upsertJob("key-v", {
      id: "job-v",
      idempotencyKey: "key-v",
      ticketId: "ticket-v",
      documentType: "EXIT",
      status: "sent",
      createdAtIso: now,
      updatedAtIso: now,
      lastError: "timeout",
      attemptCount: 2,
      result: null,
    });
    const row = state.getByIdempotency("key-v")!;
    const view = state.toView(row);
    expect(view.id).toBe("job-v");
    expect(view.idempotencyKey).toBe("key-v");
    expect(view.status).toBe("sent");
    expect(view.lastError).toBe("timeout");
    expect(view.attemptCount).toBe(2);
    expect(view.ticketId).toBe("ticket-v");
    expect(view.documentType).toBe("EXIT");
  });

  it("handles corrupt state file gracefully", () => {
    fs.writeFileSync(path.join(tmpDir, "agent-state.json"), "not json", "utf8");
    const corrupted = new PrintAgentState(tmpDir);
    corrupted.load();
    expect(corrupted.getById("any")).toBeNull();
  });
});
