import { describe, it, expect } from "vitest";
import { buildExitBody } from "./vehicle-exit.mapper";

describe("buildExitBody", () => {
  it("builds basic exit body with required fields", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-001",
      paymentMethod: "CASH",
      cashSessionId: "session-123",
      observations: "Vehicle ok",
      vehicleCondition: "good",
      conditionChecklist: "check1,check2",
      conditionPhotoUrls: "photo1.jpg,photo2.jpg",
      agreementCode: "AGR-001",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem-123",
    });

    expect(result.ticketNumber).toBe("T-001");
    expect(result.operatorUserId).toBe("user-123");
    expect(result.paymentMethod).toBe("CASH");
  });

  it("maps operatorUserId from userId", () => {
    const result = buildExitBody({
      userId: "user-456",
      ticketNumber: "T-002",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "excellent",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem-456",
    });

    expect(result.operatorUserId).toBe("user-456");
  });

  it("preserves idempotencyKey", () => {
    const idemKey = "unique-idem-789";
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-003",
      paymentMethod: "CREDIT_CARD",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: idemKey,
    });

    expect(result.idempotencyKey).toBe(idemKey);
  });

  it("splits and filters conditionChecklist", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-004",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "check1, check2, check3",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.conditionChecklist).toEqual(["check1", "check2", "check3"]);
  });

  it("handles empty conditionChecklist", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-005",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.conditionChecklist).toEqual([]);
  });

  it("trims whitespace in conditionChecklist items", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-006",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "  check1  ,  check2  ",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.conditionChecklist).toEqual(["check1", "check2"]);
  });

  it("filters out empty items from conditionChecklist", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-007",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "check1,,check2,,",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.conditionChecklist).toEqual(["check1", "check2"]);
  });

  it("splits and filters conditionPhotoUrls", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-008",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "photo1.jpg, photo2.png, photo3.jpeg",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.conditionPhotoUrls).toEqual(["photo1.jpg", "photo2.png", "photo3.jpeg"]);
  });

  it("handles empty conditionPhotoUrls", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-009",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.conditionPhotoUrls).toEqual([]);
  });

  it("filters out empty URLs from conditionPhotoUrls", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-010",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "photo1.jpg,,photo2.jpg,,",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.conditionPhotoUrls).toEqual(["photo1.jpg", "photo2.jpg"]);
  });

  it("converts empty agreementCode to null", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-011",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.agreementCode).toBeNull();
  });

  it("trims agreementCode before sending", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-012",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "  AGR-001  ",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.agreementCode).toBe("AGR-001");
  });

  it("sets agreementCode to null if only whitespace", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-013",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "   ",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.agreementCode).toBeNull();
  });

  it("does not include returnedItemIds when no pending items", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-014",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: ["item1", "item2"],
      idempotencyKey: "idem",
    });

    expect(result.returnedItemIds).toBeUndefined();
  });

  it("includes returnedItemIds when pending items exist", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-015",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [{ id: "item1" }, { id: "item2" }],
      returnConfirmedIds: ["item1"],
      idempotencyKey: "idem",
    });

    expect(result.returnedItemIds).toEqual(["item1"]);
  });

  it("sets custodiedItemObservations correctly", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-016",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [{ id: "item1" }],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.custodiedItemObservations).toBe("Devuelto en salida");
  });

  it("sets custodiedItemObservations to null when no pending items", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-017",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.custodiedItemObservations).toBeNull();
  });

  it("excludes paymentBreakdown for non-MIXED methods", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-018",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
      splitPayments: [{ method: "CASH", amount: "50" }],
    });

    expect(result.paymentBreakdown).toBeUndefined();
  });

  it("includes paymentBreakdown for MIXED payment method", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-019",
      paymentMethod: "MIXED",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
      splitPayments: [
        { method: "CASH", amount: "50" },
        { method: "CARD", amount: "100" },
      ],
    });

    expect(result.paymentBreakdown).toEqual([
      { method: "CASH", amount: 50 },
      { method: "CARD", amount: 100 },
    ]);
  });

  it("filters zero-amount payments from breakdown", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-020",
      paymentMethod: "MIXED",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
      splitPayments: [
        { method: "CASH", amount: "0" },
        { method: "CARD", amount: "100" },
      ],
    });

    expect(result.paymentBreakdown).toEqual([
      { method: "CARD", amount: 100 },
    ]);
  });

  it("converts string amounts to numbers in breakdown", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-021",
      paymentMethod: "MIXED",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
      splitPayments: [
        { method: "CASH", amount: "50.50" },
        { method: "CARD", amount: "100.00" },
      ],
    });

    expect(result.paymentBreakdown).toEqual([
      { method: "CASH", amount: 50.5 },
      { method: "CARD", amount: 100 },
    ]);
  });

  it("handles all payment methods", () => {
    const paymentMethods = ["CASH", "DEBIT_CARD", "CREDIT_CARD", "QR", "NEQUI", "DAVIPLATA", "TRANSFER", "AGREEMENT"] as const;

    paymentMethods.forEach((method) => {
      const result = buildExitBody({
        userId: "user-123",
        ticketNumber: "T-022",
        paymentMethod: method,
        cashSessionId: null,
        observations: null,
        vehicleCondition: "ok",
        conditionChecklist: "",
        conditionPhotoUrls: "",
        agreementCode: "",
        pendingCustodiedItems: [],
        returnConfirmedIds: [],
        idempotencyKey: "idem",
      });

      expect(result.paymentMethod).toBe(method);
    });
  });

  it("preserves null cashSessionId", () => {
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-023",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.cashSessionId).toBeNull();
  });

  it("preserves observations", () => {
    const obs = "Some special observations";
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-024",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: obs,
      vehicleCondition: "ok",
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.observations).toBe(obs);
  });

  it("preserves vehicleCondition", () => {
    const condition = "excellent";
    const result = buildExitBody({
      userId: "user-123",
      ticketNumber: "T-025",
      paymentMethod: "CASH",
      cashSessionId: null,
      observations: null,
      vehicleCondition: condition,
      conditionChecklist: "",
      conditionPhotoUrls: "",
      agreementCode: "",
      pendingCustodiedItems: [],
      returnConfirmedIds: [],
      idempotencyKey: "idem",
    });

    expect(result.vehicleCondition).toBe(condition);
  });
});
