import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockResolvePaperWidth = vi.fn();
const mockResolveProfile = vi.fn();

vi.mock("@/lib/print/ticket-build", () => ({
  resolvePaperWidthMmFromEnv: mockResolvePaperWidth,
  resolvePrinterProfileFromEnv: mockResolveProfile,
}));

describe("cash print", () => {
  const session = {
    id: "session-1",
    register: { id: "reg-1", site: "Site A", terminal: "TERM-1", label: "Caja 1" },
    operatorId: "op-1",
    operatorName: "Juan Perez",
    status: "OPEN",
    openingAmount: 50000,
    openedAt: "2026-06-01T08:00:00Z",
    closedAt: null,
    closedById: null,
    closedByName: null,
    expectedAmount: null,
    countedAmount: 150000,
    differenceAmount: 0,
    countCash: 100000,
    countCard: 30000,
    countTransfer: 15000,
    countOther: 5000,
    notes: null,
    closingNotes: null,
    closingWitnessName: null,
    supportDocumentNumber: null,
    countedAt: "2026-06-01T18:00:00Z",
    countOperatorId: "op-1",
    countOperatorName: "Juan Perez",
  };

  const movement = {
    id: "mov-1",
    cashSessionId: "session-1",
    movementType: "CASH_IN",
    paymentMethod: "CASH",
    amount: 50000,
    parkingSessionId: null,
    reason: "Ingreso por apertura",
    metadata: null,
    status: "COMPLETED",
    voidedAt: null,
    voidReason: null,
    voidedById: null,
    externalReference: null,
    createdById: "op-1",
    createdByName: "Juan Perez",
    createdAt: "2026-06-01T08:05:00Z",
    terminal: "TERM-1",
    idempotencyKey: null,
  };

  const parkingName = "Parking Test";

  beforeEach(() => {
    mockResolvePaperWidth.mockReturnValue(58);
    mockResolveProfile.mockReturnValue("default");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("buildCashMovementTicket", () => {
    it("builds a ticket document for a cash movement", async () => {
      const { buildCashMovementTicket } = await import("../cash-print");
      const ticket = buildCashMovementTicket(session, movement, parkingName);

      expect(ticket.ticketId).toBe("mov-1");
      expect(ticket.ticketNumber).toContain("MOV-");
      expect(ticket.parkingName).toBe("Parking Test");
      expect(ticket.plate).toBe("CAJA");
      expect(ticket.vehicleType).toBe("OTHER");
      expect(ticket.site).toBe("Site A");
      expect(ticket.terminal).toBe("TERM-1");
      expect(ticket.operatorName).toBe("Juan Perez");
      expect(ticket.issuedAtIso).toBe("2026-06-01T08:05:00Z");
      expect(ticket.barcodePayload).toBe("mov-1");
      expect(ticket.paperWidthMm).toBe(58);
      expect(ticket.printerProfile).toBe("default");
    });

    it("includes detail lines with movement info", async () => {
      const { buildCashMovementTicket } = await import("../cash-print");
      const ticket = buildCashMovementTicket(session, movement, parkingName);

      expect(ticket.detailLines).toContain("Tipo: CASH_IN");
      expect(ticket.detailLines).toContain("Medio: CASH");
      expect(ticket.detailLines).toContain("Valor: 50000");
      expect(ticket.detailLines).toContain("Motivo: Ingreso por apertura");
      expect(ticket.detailLines).toContain("Equipo/terminal: TERM-1");
      expect(ticket.detailLines).toContain("Registra: Juan Perez");
      expect(ticket.detailLines).toContain("Sesion caja: session-1");
      expect(ticket.detailLines).toContain("Estado: COMPLETED");
    });

    it("uses fallback operator name when createdByName is null", async () => {
      const movNoName = { ...movement, createdByName: null };
      const { buildCashMovementTicket } = await import("../cash-print");
      const ticket = buildCashMovementTicket(session, movNoName, parkingName);

      expect(ticket.operatorName).toBeNull();
      expect(ticket.detailLines.some((l: string) => l.startsWith("Registra:"))).toBe(true);
    });

    it("omits optional fields when empty", async () => {
      const movNoReason = { ...movement, reason: null, terminal: null };
      const { buildCashMovementTicket } = await import("../cash-print");
      const ticket = buildCashMovementTicket(session, movNoReason, parkingName);

      expect(ticket.detailLines.some((l: string) => l.startsWith("Motivo:"))).toBe(false);
      expect(ticket.detailLines.some((l: string) => l.startsWith("Equipo/terminal:"))).toBe(false);
    });
  });

  describe("buildCashCountTicket", () => {
    const summary = {
      openingAmount: 50000,
      expectedLedgerTotal: 145000,
      countedTotal: 150000,
      difference: 5000,
      totalsByPaymentMethod: { CASH: 100000, CARD: 30000, TRANSFER: 15000, OTHER: 5000 },
      totalsByMovementType: { CASH_IN: 50000, REVENUE: 95000 },
      movementCount: 15,
    };

    it("builds a cash count ticket document", async () => {
      const { buildCashCountTicket } = await import("../cash-print");
      const ticket = buildCashCountTicket(session, summary, parkingName);

      expect(ticket.ticketId).toBe("count-session-1");
      expect(ticket.ticketNumber).toContain("ARQ-");
      expect(ticket.parkingName).toBe("Parking Test");
      expect(ticket.plate).toBe("CAJA");
      expect(ticket.barcodePayload).toBe("session-1");
    });

    it("includes count summary in detail lines", async () => {
      const { buildCashCountTicket } = await import("../cash-print");
      const ticket = buildCashCountTicket(session, summary, parkingName);

      expect(ticket.detailLines).toContain("ARQUEO DE CAJA");
      expect(ticket.detailLines).toContain("Efectivo declarado: 100000");
      expect(ticket.detailLines).toContain("Tarjetas: 30000");
      expect(ticket.detailLines).toContain("Transferencias: 15000");
      expect(ticket.detailLines).toContain("Otros: 5000");
      expect(ticket.detailLines).toContain("Contado total: 150000");
      expect(ticket.detailLines).toContain("Esperado libro: 145000");
      expect(ticket.detailLines).toContain("Diferencia: 0");
    });

    it("uses countedAt for issuedAtIso", async () => {
      const { buildCashCountTicket } = await import("../cash-print");
      const ticket = buildCashCountTicket(session, summary, parkingName);

      expect(ticket.issuedAtIso).toBe("2026-06-01T18:00:00Z");
    });

    it("handles null countedAt with fallback to current date", async () => {
      const sessionNoCount = { ...session, countedAt: null };
      const { buildCashCountTicket } = await import("../cash-print");
      const ticket = buildCashCountTicket(sessionNoCount, summary, parkingName);

      expect(ticket.issuedAtIso).toBeDefined();
    });
  });
});
