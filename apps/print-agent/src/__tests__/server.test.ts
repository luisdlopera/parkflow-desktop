import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

vi.mock("@parkflow/print-core", () => ({
  buildEscPosReceiptBytes: vi.fn(() => new Uint8Array([0x1d, 0x56, 0x00])),
  resolveEscPosProfile: vi.fn(() => ({
    statusQueryBytes: new Uint8Array([0x10, 0x04, 0x01]),
    hardwareReadyAfterPrint: vi.fn(() => true),
    statusHintGsR1: vi.fn(() => "ok"),
    hasPaperHintGsR1: vi.fn(() => true),
  })),
}));

vi.mock("../dispatch.js", () => ({
  dispatchEscPosJob: vi.fn(() =>
    Promise.resolve({
      bytesSent: 10,
      hardwareConfirmed: true,
      statusByte: 0,
      statusHint: "ok",
    })
  ),
  printerQuickHealth: vi.fn(() =>
    Promise.resolve({ online: true, hasPaper: true, lastError: null, statusByte: 0 })
  ),
}));

import type { FastifyInstance } from "fastify";

describe("Print Agent Server", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Clear persisted state so each test run starts fresh
    const stateFile = path.join(process.env.PRINT_AGENT_DATA_DIR || "", "agent-state.json");
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
    }
    vi.resetModules();
    const mod = await import("../server.js");
    app = await mod.buildApp({ skipSecurity: true });
    await app.ready();
  }, 15_000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /health", () => {
    it("returns health status", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.version).toBe("0.1.0");
    });
  });

  describe("GET /printers", () => {
    it("returns printer list", async () => {
      const res = await app.inject({ method: "GET", url: "/printers" });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toBeInstanceOf(Array);
      expect(body.items.length).toBeGreaterThan(0);
      expect(body.items[0]).toHaveProperty("id");
      expect(body.items[0]).toHaveProperty("name");
    });
  });

  describe("POST /print", () => {
    const validPayload = {
      idempotencyKey: "server-test-key-001",
      documentType: "ENTRY",
      ticket: {
        ticketId: "TKT-TEST",
        templateVersion: "ticket-layout-v1",
        paperWidthMm: 58,
        ticketNumber: "001",
        parkingName: "Test",
        plate: "ABC-123",
        vehicleType: "CAR",
        site: null,
        lane: null,
        booth: null,
        terminal: null,
        operatorName: null,
        issuedAtIso: new Date().toISOString(),
        legalMessage: null,
        qrPayload: null,
        barcodePayload: null,
        copyNumber: 1,
      },
    };

    it("rejects requests without required fields", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/print",
        payload: { idempotencyKey: "", ticket: null, documentType: "" },
      });
      const body = JSON.parse(res.body);
      expect(body.error).toBe("idempotencyKey, ticket, documentType required");
    });

    it("accepts and processes a valid print request", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/print",
        payload: validPayload,
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.jobId).toBeDefined();
      expect(body.result).toBeDefined();
      expect(body.duplicate).toBe(false);
    });
  });

  describe("GET /jobs/:id", () => {
    it("returns error for unknown job", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/jobs/nonexistent",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("not found");
    });
  });

  describe("GET /printers/:id/health", () => {
    it("returns health for known printer", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/printers/default/health",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.printerId).toBe("default");
    });

    it("returns error for unknown printer", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/printers/unknown/health",
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("not found");
    });
  });
});
