import {
  operationExitRequestSchema,
  operationLostTicketRequestSchema,
  operationReprintRequestSchema,
} from "@/lib/validation/contracts";

describe("operationExitRequestSchema", () => {
  it("accepts valid exit request with ticketNumber", () => {
    const result = operationExitRequestSchema.safeParse({
      ticketNumber: "T-123",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
      paymentMethod: "CASH",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid exit request with plate", () => {
    const result = operationExitRequestSchema.safeParse({
      plate: "ABC123",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
      paymentMethod: "CASH",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when neither ticketNumber nor plate provided", () => {
    const result = operationExitRequestSchema.safeParse({
      operatorUserId: "00000000-0000-0000-0000-000000000001",
      paymentMethod: "CASH",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid plate format", () => {
    const result = operationExitRequestSchema.safeParse({
      plate: "AB@C123",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(false);
  });

  it("accepts with all optional fields", () => {
    const result = operationExitRequestSchema.safeParse({
      idempotencyKey: "key-123",
      ticketNumber: "T-123",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
      paymentMethod: "MIXED",
      cashSessionId: "cash-sess-1",
      agreementCode: "CORP10",
      observations: "Sin novedades",
      vehicleCondition: "Buen estado",
      conditionChecklist: ["carroceria_ok"],
      conditionPhotoUrls: ["https://example.test/photo.jpg"],
      returnedItemIds: ["00000000-0000-0000-0000-000000000002"],
      custodiedItemObservations: "Casco devuelto",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid payment method", () => {
    const result = operationExitRequestSchema.safeParse({
      ticketNumber: "T-123",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
      paymentMethod: "BITCOIN",
    });
    expect(result.success).toBe(false);
  });

  it("accepts exit without payment method (for zero-cost)", () => {
    const result = operationExitRequestSchema.safeParse({
      ticketNumber: "T-123",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(true);
  });
});

describe("operationLostTicketRequestSchema", () => {
  it("accepts valid lost ticket request", () => {
    const result = operationLostTicketRequestSchema.safeParse({
      ticketNumber: "T-123",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
      reason: "Ticket extraviado por el cliente",
      paymentMethod: "CASH",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when no reason provided", () => {
    const result = operationLostTicketRequestSchema.safeParse({
      ticketNumber: "T-123",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when neither ticketNumber nor plate", () => {
    const result = operationLostTicketRequestSchema.safeParse({
      operatorUserId: "00000000-0000-0000-0000-000000000001",
      reason: "Perdido",
    });
    expect(result.success).toBe(false);
  });

  it("accepts with plate instead of ticketNumber", () => {
    const result = operationLostTicketRequestSchema.safeParse({
      plate: "ABC123",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
      reason: "Ticket perdido",
    });
    expect(result.success).toBe(true);
  });
});

describe("operationReprintRequestSchema", () => {
  it("accepts valid reprint request", () => {
    const result = operationReprintRequestSchema.safeParse({
      ticketNumber: "T-123",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
      reason: "Cliente solicita copia",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when reason is empty", () => {
    const result = operationReprintRequestSchema.safeParse({
      ticketNumber: "T-123",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
      reason: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when ticketNumber is empty", () => {
    const result = operationReprintRequestSchema.safeParse({
      ticketNumber: "",
      operatorUserId: "00000000-0000-0000-0000-000000000001",
      reason: "Reimprimir",
    });
    expect(result.success).toBe(false);
  });
});
