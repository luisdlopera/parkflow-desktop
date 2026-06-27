import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrintStationConfig, TicketDocument } from "@parkflow/types";

vi.mock("serialport", () => {
  const MockPort = vi.fn(function MockPort() {
    const events: Record<string, (...args: unknown[]) => void> = {};
    return {
      on: vi.fn(),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
      open: vi.fn((cb: (e?: Error) => void) => cb?.(new Error("serialport unavailable"))),
      write: vi.fn(),
      close: vi.fn((cb?: (e?: Error) => void) => cb?.()),
      drain: vi.fn((cb?: (e?: Error) => void) => cb?.()),
    };
  });
  return {
    SerialPort: MockPort,
  };
});

vi.mock("node:net", () => {
  const mockSocket = {
    on: vi.fn(),
    once: vi.fn(),
    setTimeout: vi.fn(),
    setNoDelay: vi.fn(),
    write: vi.fn(),
    destroy: vi.fn(),
  };
  const MockNet = {
    createConnection: vi.fn(() => {
      const socket = { ...mockSocket };
      setTimeout(() => {
        const connectCb = socket.on.mock.calls.find((c: string[]) => c[0] === "connect");
        if (connectCb) connectCb[1]();
      }, 0);
      return socket;
    }),
  };
  return { default: MockNet, ...MockNet };
});

vi.mock("@parkflow/print-core", () => ({
  buildEscPosReceiptBytes: vi.fn(() => new Uint8Array([0x1d, 0x56, 0x00])),
  resolveEscPosProfile: vi.fn(() => ({
    statusQueryBytes: new Uint8Array([0x10, 0x04, 0x01]),
    hardwareReadyAfterPrint: vi.fn((b: number | null) => b === 0),
    statusHintGsR1: vi.fn((b: number) => b === 0 ? "ok" : "paper_end_detected"),
    hasPaperHintGsR1: vi.fn((b: number) => b === 0),
  })),
}));

const mockPrinter: PrintStationConfig = {
  id: "test-printer",
  name: "Test Printer",
  modelProfile: "generic_58mm_esc_pos",
  connection: "tcp",
  tcpHost: "127.0.0.1",
  tcpPort: 9100,
  serialPath: null,
  baudRate: null,
};

const mockTicket: TicketDocument = {
  ticketId: "TKT-001",
  templateVersion: "ticket-layout-v1",
  paperWidthMm: 58,
  ticketNumber: "001",
  parkingName: "ParkFlow Test",
  plate: "ABC-123",
  vehicleType: "CAR",
  site: null,
  lane: null,
  booth: null,
  terminal: null,
  operatorName: "Test Operator",
  issuedAtIso: "2026-06-26T00:00:00.000Z",
  legalMessage: null,
  qrPayload: null,
  barcodePayload: null,
  copyNumber: 1,
};

describe("dispatchEscPosJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws on invalid device config", async () => {
    const { dispatchEscPosJob } = await import("../dispatch.js");
    const badPrinter: PrintStationConfig = { ...mockPrinter, connection: "tcp", tcpHost: null, tcpPort: null };
    await expect(dispatchEscPosJob(badPrinter, "ENTRY", mockTicket)).rejects.toThrow("Invalid printer device configuration");
  });

  it("returns hardwareConfirmed=true when printer responds with OK", async () => {
    const net = await import("node:net");
    const { dispatchEscPosJob } = await import("../dispatch.js");
    vi.mocked(net.createConnection).mockImplementationOnce(() => {
      const s = {
        on: vi.fn(),
        once: vi.fn((ev: string, cb: (...args: unknown[]) => void) => {
          if (ev === "data") cb(Buffer.from([0x00]));
          return s;
        }),
        setTimeout: vi.fn(),
        setNoDelay: vi.fn(),
        write: vi.fn((_d: unknown, cb?: (e?: Error) => void) => { cb?.(); return true; }),
        destroy: vi.fn(),
      } as any;
      setTimeout(() => {
        const connectCb = s.on.mock.calls.find((c: string[]) => c[0] === "connect");
        if (connectCb) connectCb[1]();
      }, 0);
      return s;
    });
    const result = await dispatchEscPosJob(mockPrinter, "ENTRY", mockTicket);
    expect(result.hardwareConfirmed).toBe(true);
    expect(result.bytesSent).toBeGreaterThan(0);
    expect(result.statusByte).toBe(0);
  });

  it("returns hardwareConfirmed=false when status byte is non-zero", async () => {
    const net = await import("node:net");
    const { dispatchEscPosJob } = await import("../dispatch.js");
    vi.mocked(net.createConnection).mockImplementationOnce(() => {
      const s = {
        on: vi.fn(),
        once: vi.fn((ev: string, cb: (...args: unknown[]) => void) => {
          if (ev === "data") cb(Buffer.from([0x02]));
          return s;
        }),
        setTimeout: vi.fn(),
        setNoDelay: vi.fn(),
        write: vi.fn((_d: unknown, cb?: (e?: Error) => void) => { cb?.(); return true; }),
        destroy: vi.fn(),
      } as any;
      setTimeout(() => {
        const connectCb = s.on.mock.calls.find((c: string[]) => c[0] === "connect");
        if (connectCb) connectCb[1]();
      }, 0);
      return s;
    });
    const result = await dispatchEscPosJob(mockPrinter, "ENTRY", mockTicket);
    expect(result.hardwareConfirmed).toBe(false);
    expect(result.statusHint).toBe("paper_end_detected");
  });

  it("handles connection timeout", async () => {
    const net = await import("node:net");
    const { dispatchEscPosJob } = await import("../dispatch.js");
    vi.mocked(net.createConnection).mockImplementationOnce(() => {
      const s = {
        on: vi.fn(),
        once: vi.fn((ev: string, cb: (...args: unknown[]) => void) => {
          if (ev === "error") cb(new Error("connection refused"));
          return s;
        }),
        setTimeout: vi.fn(),
        setNoDelay: vi.fn(),
        write: vi.fn(),
        destroy: vi.fn(),
      } as any;
      return s;
    });
    await expect(dispatchEscPosJob(mockPrinter, "ENTRY", mockTicket)).rejects.toThrow();
  });
});

describe("printerQuickHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns online=true when printer responds", async () => {
    const net = await import("node:net");
    const { printerQuickHealth } = await import("../dispatch.js");
    vi.mocked(net.createConnection).mockImplementationOnce(() => {
      const s = {
        on: vi.fn(),
        once: vi.fn((ev: string, cb: (...args: unknown[]) => void) => {
          if (ev === "data") cb(Buffer.from([0x00]));
          return s;
        }),
        setTimeout: vi.fn(),
        setNoDelay: vi.fn(),
        write: vi.fn((_d: unknown, cb?: (e?: Error) => void) => { cb?.(); return true; }),
        destroy: vi.fn(),
      } as any;
      setTimeout(() => {
        const connectCb = s.on.mock.calls.find((c: string[]) => c[0] === "connect");
        if (connectCb) connectCb[1]();
      }, 0);
      return s;
    });
    const result = await printerQuickHealth(mockPrinter, null);
    expect(result.online).toBe(true);
  });

  it("returns online=false on error", async () => {
    const net = await import("node:net");
    const { printerQuickHealth } = await import("../dispatch.js");
    vi.mocked(net.createConnection).mockImplementationOnce(() => {
      const s = {
        on: vi.fn(),
        once: vi.fn((ev: string, cb: (...args: unknown[]) => void) => {
          if (ev === "error") cb(new Error("timeout"));
          return s;
        }),
        setTimeout: vi.fn(),
        setNoDelay: vi.fn(),
        write: vi.fn(),
        destroy: vi.fn(),
      } as any;
      return s;
    });
    const result = await printerQuickHealth(mockPrinter, null);
    expect(result.online).toBe(false);
    expect(result.lastError).toBe("timeout");
  });

  it("returns online=false for bad config", async () => {
    const { printerQuickHealth } = await import("../dispatch.js");
    const badPrinter: PrintStationConfig = { ...mockPrinter, connection: "tcp" as const, tcpHost: null, tcpPort: null };
    const result = await printerQuickHealth(badPrinter, null);
    expect(result.online).toBe(false);
    expect(result.lastError).toBe("bad config");
  });

  it("returns online=false for serial when serialport unavailable", async () => {
    const { printerQuickHealth } = await import("../dispatch.js");
    const serialPrinter: PrintStationConfig = { ...mockPrinter, connection: "serial", serialPath: "/dev/ttyUSB0", tcpHost: null, tcpPort: null };
    const result = await printerQuickHealth(serialPrinter, null);
    expect(result.online).toBe(false);
    expect(result.lastError).toBe("serialport unavailable");
  });
});
