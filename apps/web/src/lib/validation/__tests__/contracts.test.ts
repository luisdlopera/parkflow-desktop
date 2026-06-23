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
  settingsUserPatchSchema,
  settingsParametersSchema,
  settingsLegacySiteSchema,
} from "../contracts";

describe("operationEntryRequestSchema", () => {
  it.each([
    [{ plate: "ABC123", type: "CAR", operatorUserId: "550e8400-e29b-41d4-a716-446655440000" }, true],
    [{ plate: "XYZ999", type: "MOTORCYCLE", operatorUserId: "550e8400-e29b-41d4-a716-446655440000" }, true],
    [{ noPlate: true, type: "VISITOR", operatorUserId: "550e8400-e29b-41d4-a716-446655440000" }, true],
    [{ type: "CAR", operatorUserId: "550e8400-e29b-41d4-a716-446655440000" }, false],
  ])("validates entry request %#", (data, isValid) => {
    const result = operationEntryRequestSchema.safeParse(data);
    expect(result.success).toBe(isValid);
  });

  it("accepts optional idempotency key", () => {
    const data = {
      idempotencyKey: "key-123",
      plate: "ABC123",
      type: "CAR",
      operatorUserId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(operationEntryRequestSchema.safeParse(data).success).toBe(true);
  });

  it("rejects long idempotency key", () => {
    const data = {
      idempotencyKey: "x".repeat(201),
      plate: "ABC123",
      type: "CAR",
      operatorUserId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(operationEntryRequestSchema.safeParse(data).success).toBe(false);
  });

  it("rejects invalid plate characters", () => {
    const data = {
      plate: "ABC@123",
      type: "CAR",
      operatorUserId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(operationEntryRequestSchema.safeParse(data).success).toBe(false);
  });

  it("accepts entry modes", () => {
    const modes = ["VISITOR", "AGREEMENT", "SUBSCRIBER", "EMPLOYEE"];
    modes.forEach((mode) => {
      const data = {
        plate: "ABC123",
        type: "CAR",
        entryMode: mode,
        operatorUserId: "550e8400-e29b-41d4-a716-446655440000",
      };
      expect(operationEntryRequestSchema.safeParse(data).success).toBe(true);
    });
  });
});

describe("operationExitRequestSchema", () => {
  const validOperatorId = "550e8400-e29b-41d4-a716-446655440000";

  it.each([
    [{ ticketNumber: "T-001", operatorUserId: validOperatorId }, true],
    [{ plate: "ABC123", operatorUserId: validOperatorId }, true],
    [{ operatorUserId: validOperatorId }, false],
  ])("validates exit request %#", (data, isValid) => {
    const result = operationExitRequestSchema.safeParse(data);
    expect(result.success).toBe(isValid);
  });

  it("accepts payment methods", () => {
    const methods = ["CASH", "DEBIT_CARD", "CREDIT_CARD", "QR", "TRANSFER"];
    methods.forEach((method) => {
      const data = {
        plate: "ABC123",
        operatorUserId: validOperatorId,
        paymentMethod: method,
      };
      expect(operationExitRequestSchema.safeParse(data).success).toBe(true);
    });
  });

  it("accepts optional return items", () => {
    const data = {
      plate: "ABC123",
      operatorUserId: validOperatorId,
      returnedItemIds: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"],
    };
    expect(operationExitRequestSchema.safeParse(data).success).toBe(true);
  });
});

describe("operationReprintRequestSchema", () => {
  it("validates reprint request", () => {
    const data = {
      ticketNumber: "T-001",
      operatorUserId: "550e8400-e29b-41d4-a716-446655440000",
      reason: "damaged",
    };
    expect(operationReprintRequestSchema.safeParse(data).success).toBe(true);
  });

  it("requires non-empty reason", () => {
    const data = {
      ticketNumber: "T-001",
      operatorUserId: "550e8400-e29b-41d4-a716-446655440000",
      reason: "",
    };
    expect(operationReprintRequestSchema.safeParse(data).success).toBe(false);
  });
});

describe("operationLostTicketRequestSchema", () => {
  const validOperatorId = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts either ticket or plate", () => {
    const withTicket = {
      ticketNumber: "T-001",
      operatorUserId: validOperatorId,
      reason: "lost",
    };
    const withPlate = {
      plate: "ABC123",
      operatorUserId: validOperatorId,
      reason: "lost",
    };
    expect(operationLostTicketRequestSchema.safeParse(withTicket).success).toBe(true);
    expect(operationLostTicketRequestSchema.safeParse(withPlate).success).toBe(true);
  });

  it("requires at least ticket or plate", () => {
    const data = {
      operatorUserId: validOperatorId,
      reason: "lost",
    };
    expect(operationLostTicketRequestSchema.safeParse(data).success).toBe(false);
  });
});

describe("cashOpenRequestSchema", () => {
  it("validates cash open request", () => {
    const data = {
      site: "Site A",
      terminal: "Terminal 1",
      openingAmount: 100000,
      operatorUserId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(cashOpenRequestSchema.safeParse(data).success).toBe(true);
  });

  it("requires positive opening amount", () => {
    const data = {
      site: "Site A",
      terminal: "Terminal 1",
      openingAmount: -100,
      operatorUserId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(cashOpenRequestSchema.safeParse(data).success).toBe(false);
  });

  it("accepts zero opening amount", () => {
    const data = {
      site: "Site A",
      terminal: "Terminal 1",
      openingAmount: 0,
      operatorUserId: "550e8400-e29b-41d4-a716-446655440000",
    };
    expect(cashOpenRequestSchema.safeParse(data).success).toBe(true);
  });
});

describe("cashMovementRequestSchema", () => {
  it("validates cash movement", () => {
    const data = {
      type: "ENTRY",
      paymentMethod: "CASH",
      amount: 50000,
    };
    expect(cashMovementRequestSchema.safeParse(data).success).toBe(true);
  });

  it("requires amount >= 0.01", () => {
    const data = {
      type: "ENTRY",
      paymentMethod: "CASH",
      amount: 0.001,
    };
    expect(cashMovementRequestSchema.safeParse(data).success).toBe(false);
  });

  it("accepts metadata", () => {
    const data = {
      type: "ENTRY",
      paymentMethod: "CASH",
      amount: 50000,
      metadataJson: '{"key":"value"}',
    };
    expect(cashMovementRequestSchema.safeParse(data).success).toBe(true);
  });
});

describe("cashVoidMovementRequestSchema", () => {
  it("validates void movement", () => {
    const data = {
      reason: "incorrect amount",
    };
    expect(cashVoidMovementRequestSchema.safeParse(data).success).toBe(true);
  });

  it("requires reason", () => {
    const data = { reason: "" };
    expect(cashVoidMovementRequestSchema.safeParse(data).success).toBe(false);
  });
});

describe("cashCountRequestSchema", () => {
  it("validates cash count", () => {
    const data = {
      countCash: 1000000,
      countCard: 500000,
      countTransfer: 300000,
      countOther: 50000,
    };
    expect(cashCountRequestSchema.safeParse(data).success).toBe(true);
  });

  it("accepts denominations array", () => {
    const data = {
      countCash: 1000000,
      countCard: 0,
      countTransfer: 0,
      countOther: 0,
      denominations: [
        { denomination: 50000, quantity: 10 },
        { denomination: 20000, quantity: 20 },
      ],
    };
    expect(cashCountRequestSchema.safeParse(data).success).toBe(true);
  });
});

describe("authLoginRequestSchema", () => {
  it("validates login request", () => {
    const data = {
      email: "user@example.com",
      password: "password123",
      deviceId: "device-1",
      deviceName: "Mobile",
      platform: "iOS",
      fingerprint: "fp-123",
    };
    expect(authLoginRequestSchema.safeParse(data).success).toBe(true);
  });

  it("requires valid email", () => {
    const data = {
      email: "not-an-email",
      password: "password123",
      deviceId: "device-1",
      deviceName: "Mobile",
      platform: "iOS",
      fingerprint: "fp-123",
    };
    expect(authLoginRequestSchema.safeParse(data).success).toBe(false);
  });

  it("requires password", () => {
    const data = {
      email: "user@example.com",
      password: "",
      deviceId: "device-1",
      deviceName: "Mobile",
      platform: "iOS",
      fingerprint: "fp-123",
    };
    expect(authLoginRequestSchema.safeParse(data).success).toBe(false);
  });
});

describe("licensingHeartbeatRequestSchema", () => {
  const validCompanyId = "550e8400-e29b-41d4-a716-446655440000";

  it("validates heartbeat request", () => {
    const data = {
      companyId: validCompanyId,
      deviceFingerprint: "fp-123",
      appVersion: "1.0.0",
    };
    expect(licensingHeartbeatRequestSchema.safeParse(data).success).toBe(true);
  });

  it("accepts optional sync counts", () => {
    const data = {
      companyId: validCompanyId,
      deviceFingerprint: "fp-123",
      appVersion: "1.0.0",
      pendingSyncCount: 5,
      syncedCount: 10,
      failedSyncCount: 1,
    };
    expect(licensingHeartbeatRequestSchema.safeParse(data).success).toBe(true);
  });
});

describe("licensingCreateCompanyRequestSchema", () => {
  it("validates company creation", () => {
    const data = {
      name: "Test Company",
      plan: "LOCAL",
    };
    expect(licensingCreateCompanyRequestSchema.safeParse(data).success).toBe(true);
  });

  it("accepts all plan types", () => {
    const plans = ["LOCAL", "SYNC", "PRO", "ENTERPRISE"];
    plans.forEach((plan) => {
      const data = { name: "Company", plan };
      expect(licensingCreateCompanyRequestSchema.safeParse(data).success).toBe(true);
    });
  });

  it("accepts optional contact details", () => {
    const data = {
      name: "Company",
      plan: "PRO",
      nit: "123456789",
      email: "contact@company.com",
      phone: "1234567890",
      contactName: "John Doe",
    };
    expect(licensingCreateCompanyRequestSchema.safeParse(data).success).toBe(true);
  });
});

describe("licensingUpdateCompanyRequestSchema", () => {
  it("validates all fields optional", () => {
    const data = {};
    expect(licensingUpdateCompanyRequestSchema.safeParse(data).success).toBe(true);
  });

  it("accepts status updates", () => {
    const statuses = ["ACTIVE", "PAST_DUE", "SUSPENDED", "BLOCKED", "EXPIRED", "TRIAL", "CANCELLED"];
    statuses.forEach((status) => {
      const data = { status };
      expect(licensingUpdateCompanyRequestSchema.safeParse(data).success).toBe(true);
    });
  });
});

describe("settingsRateStatusSchema", () => {
  it.each([[{ active: true }, true], [{ active: false }, true], [{ active: "yes" }, false]])(
    "validates rate status %#",
    (data, isValid) => {
      expect(settingsRateStatusSchema.safeParse(data).success).toBe(isValid);
    }
  );
});

describe("settingsUserStatusSchema", () => {
  it.each([[{ active: true }, true], [{ active: false }, true]])(
    "validates user status %#",
    (data, isValid) => {
      expect(settingsUserStatusSchema.safeParse(data).success).toBe(isValid);
    }
  );
});

describe("settingsPasswordResetSchema", () => {
  it("requires 8+ character password", () => {
    expect(settingsPasswordResetSchema.safeParse({ newPassword: "short" }).success).toBe(false);
    expect(settingsPasswordResetSchema.safeParse({ newPassword: "longenough" }).success).toBe(true);
  });
});

describe("settingsRateUpsertSchema", () => {
  it("validates rate creation", () => {
    const data = {
      name: "Standard Rate",
      rateType: "HOURLY",
      amount: 5000,
      graceMinutes: 15,
      toleranceMinutes: 5,
      fractionMinutes: 30,
      roundingMode: "UP",
      lostTicketSurcharge: 10000,
      active: true,
      site: "Main Site",
    };
    expect(settingsRateUpsertSchema.safeParse(data).success).toBe(true);
  });

  it("accepts all rate types", () => {
    const types = ["HOURLY", "FRACTION", "DAILY", "FLAT"];
    types.forEach((type) => {
      const data = {
        name: "Rate",
        rateType: type,
        amount: 5000,
        graceMinutes: 0,
        toleranceMinutes: 0,
        fractionMinutes: 30,
        roundingMode: "UP",
        lostTicketSurcharge: 0,
        active: true,
        site: "Site",
      };
      expect(settingsRateUpsertSchema.safeParse(data).success).toBe(true);
    });
  });
});

describe("settingsUserCreateSchema", () => {
  it("validates user creation", () => {
    const data = {
      name: "John Operator",
      email: "john@parking.com",
      role: "OPERADOR",
      initialPassword: "SecurePass123",
    };
    expect(settingsUserCreateSchema.safeParse(data).success).toBe(true);
  });

  it("accepts all roles", () => {
    const roles = ["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "CAJERO", "OPERADOR"];
    roles.forEach((role) => {
      const data = {
        name: "User",
        email: "user@parking.com",
        role,
        initialPassword: "SecurePass123",
      };
      expect(settingsUserCreateSchema.safeParse(data).success).toBe(true);
    });
  });

  it("requires 8+ character password", () => {
    const data = {
      name: "User",
      email: "user@parking.com",
      role: "OPERADOR",
      initialPassword: "short",
    };
    expect(settingsUserCreateSchema.safeParse(data).success).toBe(false);
  });
});

describe("settingsParametersSchema", () => {
  it("validates all parameters optional", () => {
    expect(settingsParametersSchema.safeParse({}).success).toBe(true);
  });

  it("validates brand color format", () => {
    const valid = { brandColor: "#D97757" };
    const invalid = { brandColor: "red" };
    expect(settingsParametersSchema.safeParse(valid).success).toBe(true);
    expect(settingsParametersSchema.safeParse(invalid).success).toBe(false);
  });

  it("validates tax rate 0-100", () => {
    expect(settingsParametersSchema.safeParse({ taxRatePercent: 19 }).success).toBe(true);
    expect(settingsParametersSchema.safeParse({ taxRatePercent: 101 }).success).toBe(false);
    expect(settingsParametersSchema.safeParse({ taxRatePercent: -1 }).success).toBe(false);
  });
});

describe("settingsLegacySiteSchema", () => {
  it("validates site creation", () => {
    const data = {
      code: "MAIN",
      name: "Main Site",
      maxCapacity: 500,
    };
    expect(settingsLegacySiteSchema.safeParse(data).success).toBe(true);
  });

  it("requires non-empty code and name", () => {
    const data = { code: "", name: "Site" };
    expect(settingsLegacySiteSchema.safeParse(data).success).toBe(false);
  });
});
