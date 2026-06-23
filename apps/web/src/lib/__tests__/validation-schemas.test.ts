import { describe, it, expect } from "vitest";
import {
  operationEntryRequestSchema,
  operationExitRequestSchema,
  operationReprintRequestSchema,
  operationLostTicketRequestSchema,
  cashOpenRequestSchema,
  cashMovementRequestSchema,
  cashVoidMovementRequestSchema,
  cashCountRequestSchema,
  cashCloseRequestSchema,
  createPrintJobRequestSchema,
  authLoginRequestSchema,
  authRefreshRequestSchema,
  licensingHeartbeatRequestSchema,
  licensingValidateRequestSchema,
  licensingCreateCompanyRequestSchema,
  licensingUpdateCompanyRequestSchema,
  licensingGenerateLicenseRequestSchema,
  licensingRemoteCommandRequestSchema,
  settingsRateStatusSchema,
  settingsUserStatusSchema,
  settingsPasswordResetSchema,
  settingsRateUpsertSchema,
  settingsUserCreateSchema,
} from "../validation/contracts";

describe("operationEntryRequestSchema", () => {
  it.each([
    {
      desc: "valid entry with plate",
      data: { plate: "ABC123", type: "CAR", operatorUserId: "12345678-1234-1234-1234-123456789012" },
      valid: true,
    },
    {
      desc: "valid entry without plate",
      data: { type: "CAR", operatorUserId: "12345678-1234-1234-1234-123456789012", noPlate: true },
      valid: true,
    },
    {
      desc: "invalid - no plate and no noPlate flag",
      data: { type: "CAR", operatorUserId: "12345678-1234-1234-1234-123456789012" },
      valid: false,
    },
    {
      desc: "invalid - plate with invalid characters",
      data: { plate: "ABC@123", type: "CAR", operatorUserId: "12345678-1234-1234-1234-123456789012" },
      valid: false,
    },
    {
      desc: "invalid - missing required operatorUserId",
      data: { plate: "ABC123", type: "CAR" },
      valid: false,
    },
    {
      desc: "valid entry with all optional fields",
      data: {
        plate: "ABC123",
        type: "CAR",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        countryCode: "CO",
        entryMode: "VISITOR",
        rateId: "87654321-4321-4321-4321-210987654321",
        site: "Site1",
        observations: "Test observation",
      },
      valid: true,
    },
    {
      desc: "valid - noPlateReason with noPlate",
      data: {
        type: "CAR",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        noPlate: true,
        noPlateReason: "Placa ilegible",
      },
      valid: true,
    },
  ])("$desc", ({ data, valid }) => {
    const result = operationEntryRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("operationExitRequestSchema", () => {
  it.each([
    {
      desc: "valid exit with ticket",
      data: { ticketNumber: "T12345", operatorUserId: "12345678-1234-1234-1234-123456789012" },
      valid: true,
    },
    {
      desc: "valid exit with plate",
      data: { plate: "ABC123", operatorUserId: "12345678-1234-1234-1234-123456789012" },
      valid: true,
    },
    {
      desc: "invalid - no ticket and no plate",
      data: { operatorUserId: "12345678-1234-1234-1234-123456789012" },
      valid: false,
    },
    {
      desc: "invalid - plate too short",
      data: { plate: "AB", operatorUserId: "12345678-1234-1234-1234-123456789012" },
      valid: false,
    },
    {
      desc: "valid - with payment method",
      data: {
        ticketNumber: "T12345",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        paymentMethod: "CASH",
      },
      valid: true,
    },
    {
      desc: "valid - with agreement code",
      data: {
        ticketNumber: "T12345",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        agreementCode: "AGR123",
      },
      valid: true,
    },
    {
      desc: "valid - with returned items",
      data: {
        ticketNumber: "T12345",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        returnedItemIds: ["87654321-4321-4321-4321-210987654321"],
      },
      valid: true,
    },
  ])("$desc", ({ data, valid }) => {
    const result = operationExitRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("operationReprintRequestSchema", () => {
  it.each([
    {
      desc: "valid reprint request",
      data: {
        ticketNumber: "T12345",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        reason: "Damaged ticket",
      },
      valid: true,
    },
    {
      desc: "invalid - missing reason",
      data: { ticketNumber: "T12345", operatorUserId: "12345678-1234-1234-1234-123456789012" },
      valid: false,
    },
    {
      desc: "invalid - empty ticket number",
      data: {
        ticketNumber: "",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        reason: "Reprint",
      },
      valid: false,
    },
  ])("$desc", ({ data, valid }) => {
    const result = operationReprintRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("operationLostTicketRequestSchema", () => {
  it.each([
    {
      desc: "valid lost ticket with ticket number",
      data: {
        ticketNumber: "T12345",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        reason: "Lost ticket",
      },
      valid: true,
    },
    {
      desc: "valid lost ticket with plate",
      data: {
        plate: "ABC123",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        reason: "Lost ticket",
      },
      valid: true,
    },
    {
      desc: "invalid - no ticket or plate",
      data: {
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        reason: "Lost",
      },
      valid: false,
    },
    {
      desc: "valid - with payment method",
      data: {
        ticketNumber: "T12345",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        paymentMethod: "CREDIT_CARD",
        reason: "Lost ticket",
      },
      valid: true,
    },
  ])("$desc", ({ data, valid }) => {
    const result = operationLostTicketRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("cashOpenRequestSchema", () => {
  it.each([
    {
      desc: "valid cash open",
      data: {
        site: "Site1",
        terminal: "T1",
        openingAmount: 100000,
        operatorUserId: "12345678-1234-1234-1234-123456789012",
      },
      valid: true,
    },
    {
      desc: "invalid - missing site",
      data: {
        terminal: "T1",
        openingAmount: 100000,
        operatorUserId: "12345678-1234-1234-1234-123456789012",
      },
      valid: false,
    },
    {
      desc: "invalid - empty site",
      data: {
        site: "",
        terminal: "T1",
        openingAmount: 100000,
        operatorUserId: "12345678-1234-1234-1234-123456789012",
      },
      valid: false,
    },
    {
      desc: "invalid - negative amount",
      data: {
        site: "Site1",
        terminal: "T1",
        openingAmount: -100,
        operatorUserId: "12345678-1234-1234-1234-123456789012",
      },
      valid: false,
    },
    {
      desc: "valid - with notes and register label",
      data: {
        site: "Site1",
        terminal: "T1",
        registerLabel: "Caja Rápida",
        openingAmount: 500000,
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        notes: "Opening notes",
      },
      valid: true,
    },
  ])("$desc", ({ data, valid }) => {
    const result = cashOpenRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("cashMovementRequestSchema", () => {
  it.each([
    {
      desc: "valid cash movement",
      data: {
        type: "PAYMENT",
        paymentMethod: "CASH",
        amount: 50000,
      },
      valid: true,
    },
    {
      desc: "invalid - zero amount",
      data: {
        type: "PAYMENT",
        paymentMethod: "CASH",
        amount: 0,
      },
      valid: false,
    },
    {
      desc: "invalid - negative amount",
      data: {
        type: "PAYMENT",
        paymentMethod: "CASH",
        amount: -100,
      },
      valid: false,
    },
    {
      desc: "valid - with parking session",
      data: {
        type: "PAYMENT",
        paymentMethod: "DEBIT_CARD",
        amount: 75000,
        parkingSessionId: "87654321-4321-4321-4321-210987654321",
      },
      valid: true,
    },
    {
      desc: "valid - with reason and metadata",
      data: {
        type: "REFUND",
        paymentMethod: "CASH",
        amount: 25000,
        reason: "Customer refund",
        metadataJson: '{"note":"test"}',
      },
      valid: true,
    },
  ])("$desc", ({ data, valid }) => {
    const result = cashMovementRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("cashVoidMovementRequestSchema", () => {
  it.each([
    {
      desc: "valid void movement",
      data: { reason: "Wrong movement" },
      valid: true,
    },
    {
      desc: "invalid - missing reason",
      data: {},
      valid: false,
    },
    {
      desc: "invalid - empty reason",
      data: { reason: "" },
      valid: false,
    },
  ])("$desc", ({ data, valid }) => {
    const result = cashVoidMovementRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("cashCountRequestSchema", () => {
  it.each([
    {
      desc: "valid cash count",
      data: {
        countCash: 1000000,
        countCard: 500000,
        countTransfer: 250000,
        countOther: 100000,
      },
      valid: true,
    },
    {
      desc: "invalid - negative cash",
      data: {
        countCash: -100,
        countCard: 500000,
        countTransfer: 250000,
        countOther: 100000,
      },
      valid: false,
    },
    {
      desc: "valid - with denominations",
      data: {
        countCash: 500000,
        countCard: 0,
        countTransfer: 0,
        countOther: 0,
        denominations: [
          { denomination: 50000, quantity: 5 },
          { denomination: 100000, quantity: 3 },
        ],
      },
      valid: true,
    },
  ])("$desc", ({ data, valid }) => {
    const result = cashCountRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("cashCloseRequestSchema", () => {
  it.each([
    {
      desc: "valid cash close",
      data: {},
      valid: true,
    },
    {
      desc: "valid - with notes",
      data: { closingNotes: "All cash counted and verified" },
      valid: true,
    },
    {
      desc: "valid - with witness",
      data: { closingWitnessName: "John Doe" },
      valid: true,
    },
  ])("$desc", ({ data, valid }) => {
    const result = cashCloseRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("createPrintJobRequestSchema", () => {
  it.each([
    {
      desc: "valid print job - ENTRY",
      data: {
        sessionId: "87654321-4321-4321-4321-210987654321",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        documentType: "ENTRY",
        idempotencyKey: "key1",
        payloadHash: "hash1",
      },
      valid: true,
    },
    {
      desc: "valid print job - EXIT",
      data: {
        sessionId: "87654321-4321-4321-4321-210987654321",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        documentType: "EXIT",
        idempotencyKey: "key2",
        payloadHash: "hash2",
      },
      valid: true,
    },
    {
      desc: "valid print job - CASH_CLOSING",
      data: {
        sessionId: "87654321-4321-4321-4321-210987654321",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        documentType: "CASH_CLOSING",
        idempotencyKey: "key3",
        payloadHash: "hash3",
      },
      valid: true,
    },
    {
      desc: "invalid - invalid document type",
      data: {
        sessionId: "87654321-4321-4321-4321-210987654321",
        operatorUserId: "12345678-1234-1234-1234-123456789012",
        documentType: "INVALID_TYPE",
        idempotencyKey: "key",
        payloadHash: "hash",
      },
      valid: false,
    },
  ])("$desc", ({ data, valid }) => {
    const result = createPrintJobRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("authLoginRequestSchema", () => {
  it.each([
    {
      desc: "valid login",
      data: {
        email: "user@example.com",
        password: "password123",
        deviceId: "device1",
        deviceName: "iPhone",
        platform: "iOS",
        fingerprint: "fp1",
      },
      valid: true,
    },
    {
      desc: "invalid - bad email",
      data: {
        email: "invalid-email",
        password: "password123",
        deviceId: "device1",
        deviceName: "iPhone",
        platform: "iOS",
        fingerprint: "fp1",
      },
      valid: false,
    },
    {
      desc: "invalid - empty password",
      data: {
        email: "user@example.com",
        password: "",
        deviceId: "device1",
        deviceName: "iPhone",
        platform: "iOS",
        fingerprint: "fp1",
      },
      valid: false,
    },
    {
      desc: "valid - with offline hours",
      data: {
        email: "user@example.com",
        password: "password123",
        deviceId: "device1",
        deviceName: "iPhone",
        platform: "iOS",
        fingerprint: "fp1",
        offlineRequestedHours: 24,
      },
      valid: true,
    },
  ])("$desc", ({ data, valid }) => {
    const result = authLoginRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("authRefreshRequestSchema", () => {
  it.each([
    {
      desc: "valid refresh",
      data: { deviceId: "device1" },
      valid: true,
    },
    {
      desc: "valid - with refresh token",
      data: { deviceId: "device1", refreshToken: "token123" },
      valid: true,
    },
    {
      desc: "invalid - no device ID",
      data: { refreshToken: "token123" },
      valid: false,
    },
  ])("$desc", ({ data, valid }) => {
    const result = authRefreshRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("licensingHeartbeatRequestSchema", () => {
  it.each([
    {
      desc: "valid heartbeat",
      data: {
        companyId: "87654321-4321-4321-4321-210987654321",
        deviceFingerprint: "fp1",
        appVersion: "1.0.0",
      },
      valid: true,
    },
    {
      desc: "valid - with sync counts",
      data: {
        companyId: "87654321-4321-4321-4321-210987654321",
        deviceFingerprint: "fp1",
        appVersion: "1.0.0",
        pendingSyncCount: 5,
        syncedCount: 10,
        failedSyncCount: 0,
      },
      valid: true,
    },
    {
      desc: "invalid - bad company ID",
      data: {
        companyId: "not-a-uuid",
        deviceFingerprint: "fp1",
        appVersion: "1.0.0",
      },
      valid: false,
    },
  ])("$desc", ({ data, valid }) => {
    const result = licensingHeartbeatRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("licensingValidateRequestSchema", () => {
  it.each([
    {
      desc: "valid license validation",
      data: {
        companyId: "87654321-4321-4321-4321-210987654321",
        deviceFingerprint: "fp1",
        licenseKey: "LICENSE123",
        signature: "sig123",
      },
      valid: true,
    },
    {
      desc: "invalid - missing signature",
      data: {
        companyId: "87654321-4321-4321-4321-210987654321",
        deviceFingerprint: "fp1",
        licenseKey: "LICENSE123",
      },
      valid: false,
    },
  ])("$desc", ({ data, valid }) => {
    const result = licensingValidateRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("licensingCreateCompanyRequestSchema", () => {
  it.each([
    {
      desc: "valid company creation",
      data: {
        name: "My Company",
        plan: "LOCAL",
      },
      valid: true,
    },
    {
      desc: "valid - with all optional fields",
      data: {
        name: "My Company",
        plan: "PRO",
        nit: "123456789",
        email: "contact@company.com",
        maxDevices: 5,
        maxLocations: 3,
        trialDays: 30,
      },
      valid: true,
    },
    {
      desc: "invalid - empty name",
      data: {
        name: "",
        plan: "LOCAL",
      },
      valid: false,
    },
    {
      desc: "invalid - bad email",
      data: {
        name: "My Company",
        plan: "LOCAL",
        email: "invalid-email",
      },
      valid: false,
    },
  ])("$desc", ({ data, valid }) => {
    const result = licensingCreateCompanyRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("licensingUpdateCompanyRequestSchema", () => {
  it.each([
    {
      desc: "valid company update - just name",
      data: { name: "Updated Name" },
      valid: true,
    },
    {
      desc: "valid - with plan change",
      data: { plan: "ENTERPRISE" },
      valid: true,
    },
    {
      desc: "valid - with status",
      data: { status: "SUSPENDED" },
      valid: true,
    },
    {
      desc: "invalid - bad email",
      data: { email: "not-an-email" },
      valid: false,
    },
  ])("$desc", ({ data, valid }) => {
    const result = licensingUpdateCompanyRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("licensingGenerateLicenseRequestSchema", () => {
  it.each([
    {
      desc: "valid license generation",
      data: {
        companyId: "87654321-4321-4321-4321-210987654321",
        deviceFingerprint: "fp1",
      },
      valid: true,
    },
    {
      desc: "valid - with optional fields",
      data: {
        companyId: "87654321-4321-4321-4321-210987654321",
        deviceFingerprint: "fp1",
        hostname: "workstation-1",
        expiresAt: "2024-12-31",
      },
      valid: true,
    },
  ])("$desc", ({ data, valid }) => {
    const result = licensingGenerateLicenseRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("licensingRemoteCommandRequestSchema", () => {
  it.each([
    {
      desc: "valid remote command - BLOCK_SYSTEM",
      data: {
        deviceId: "87654321-4321-4321-4321-210987654321",
        command: "BLOCK_SYSTEM",
      },
      valid: true,
    },
    {
      desc: "valid - with reason",
      data: {
        deviceId: "87654321-4321-4321-4321-210987654321",
        command: "REVOKE_LICENSE",
        reason: "License expired",
      },
      valid: true,
    },
  ])("$desc", ({ data, valid }) => {
    const result = licensingRemoteCommandRequestSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("settingsRateStatusSchema", () => {
  it.each([
    { desc: "active rate", data: { active: true }, valid: true },
    { desc: "inactive rate", data: { active: false }, valid: true },
    { desc: "invalid - missing active", data: {}, valid: false },
  ])("$desc", ({ data, valid }) => {
    const result = settingsRateStatusSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("settingsUserStatusSchema", () => {
  it.each([
    { desc: "active user", data: { active: true }, valid: true },
    { desc: "inactive user", data: { active: false }, valid: true },
  ])("$desc", ({ data, valid }) => {
    const result = settingsUserStatusSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("settingsPasswordResetSchema", () => {
  it.each([
    {
      desc: "valid password",
      data: { newPassword: "NewPassword123!" },
      valid: true,
    },
    {
      desc: "invalid - too short",
      data: { newPassword: "short" },
      valid: false,
    },
    {
      desc: "invalid - too long",
      data: { newPassword: "x".repeat(121) },
      valid: false,
    },
  ])("$desc", ({ data, valid }) => {
    const result = settingsPasswordResetSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("settingsRateUpsertSchema", () => {
  it.each([
    {
      desc: "valid hourly rate",
      data: {
        name: "Tarifa Normal",
        rateType: "HOURLY",
        amount: 5000,
        graceMinutes: 5,
        toleranceMinutes: 0,
        fractionMinutes: 60,
        roundingMode: "UP",
        lostTicketSurcharge: 10000,
        active: true,
        site: "Site1",
      },
      valid: true,
    },
    {
      desc: "valid fraction rate",
      data: {
        name: "Tarifa Fraccional",
        rateType: "FRACTION",
        amount: 2500,
        graceMinutes: 0,
        toleranceMinutes: 0,
        fractionMinutes: 30,
        roundingMode: "NEAREST",
        lostTicketSurcharge: 0,
        active: true,
        site: "Site1",
      },
      valid: true,
    },
    {
      desc: "invalid - missing name",
      data: {
        rateType: "HOURLY",
        amount: 5000,
        graceMinutes: 5,
        toleranceMinutes: 0,
        fractionMinutes: 60,
        roundingMode: "UP",
        lostTicketSurcharge: 0,
        active: true,
        site: "Site1",
      },
      valid: false,
    },
    {
      desc: "invalid - negative amount",
      data: {
        name: "Bad Rate",
        rateType: "HOURLY",
        amount: -1000,
        graceMinutes: 0,
        toleranceMinutes: 0,
        fractionMinutes: 60,
        roundingMode: "UP",
        lostTicketSurcharge: 0,
        active: true,
        site: "Site1",
      },
      valid: false,
    },
  ])("$desc", ({ data, valid }) => {
    const result = settingsRateUpsertSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});

describe("settingsUserCreateSchema", () => {
  it.each([
    {
      desc: "valid user creation - OPERADOR",
      data: {
        name: "Juan Perez",
        email: "juan@example.com",
        role: "OPERADOR",
        initialPassword: "TempPassword123",
      },
      valid: true,
    },
    {
      desc: "valid - with all optional fields",
      data: {
        name: "Maria Garcia",
        email: "maria@example.com",
        role: "CAJERO",
        document: "12345678",
        phone: "3001234567",
        site: "Site1",
        terminal: "T1",
        canVoidTickets: true,
        initialPassword: "SecurePass123",
      },
      valid: true,
    },
    {
      desc: "invalid - bad email",
      data: {
        name: "Test User",
        email: "invalid-email",
        role: "OPERADOR",
        initialPassword: "Password123",
      },
      valid: false,
    },
    {
      desc: "invalid - empty name",
      data: {
        name: "",
        email: "user@example.com",
        role: "OPERADOR",
        initialPassword: "Password123",
      },
      valid: false,
    },
    {
      desc: "invalid - missing initialPassword",
      data: {
        name: "Test User",
        email: "user@example.com",
        role: "OPERADOR",
      },
      valid: false,
    },
  ])("$desc", ({ data, valid }) => {
    const result = settingsUserCreateSchema.safeParse(data);
    expect(result.success).toBe(valid);
  });
});
