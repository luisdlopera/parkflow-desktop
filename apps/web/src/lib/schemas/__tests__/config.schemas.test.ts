import { describe, it, expect } from "vitest";
import {
  parkingSiteSchema,
  paymentMethodSchema,
  printerSchema,
  operationalParameterSchema,
  rateFractionSchema,
  cashRegisterSchema,
  vehicleTypeSchema
} from "../config.schemas";

describe("parkingSiteSchema", () => {
  it("should validate valid parking site", () => {
    const data = {
      code: "SITE01",
      name: "Main Parking",
      address: "123 Main St",
      city: "Bogotá",
      phone: "+57300123456",
      managerName: "John Doe",
      timezone: "America/Bogota",
      currency: "COP",
      maxCapacity: 100,
      isActive: true
    };
    const result = parkingSiteSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should reject code too short", () => {
    const result = parkingSiteSchema.safeParse({
      code: "S",
      name: "Main Parking"
    });
    expect(result.success).toBe(false);
  });

  it("should reject code too long", () => {
    const result = parkingSiteSchema.safeParse({
      code: "S".repeat(21),
      name: "Main Parking"
    });
    expect(result.success).toBe(false);
  });

  it("should reject name too short", () => {
    const result = parkingSiteSchema.safeParse({
      code: "SITE01",
      name: "AB"
    });
    expect(result.success).toBe(false);
  });

  it("should reject name too long", () => {
    const result = parkingSiteSchema.safeParse({
      code: "SITE01",
      name: "A".repeat(121)
    });
    expect(result.success).toBe(false);
  });

  it("should allow optional fields", () => {
    const result = parkingSiteSchema.safeParse({
      code: "SITE01",
      name: "Main Parking"
    });
    expect(result.success).toBe(true);
  });

  it("should default timezone to America/Bogota", () => {
    const result = parkingSiteSchema.safeParse({
      code: "SITE01",
      name: "Main Parking"
    });
    if (result.success) {
      expect(result.data.timezone).toBe("America/Bogota");
    }
  });

  it("should default currency to COP", () => {
    const result = parkingSiteSchema.safeParse({
      code: "SITE01",
      name: "Main Parking"
    });
    if (result.success) {
      expect(result.data.currency).toBe("COP");
    }
  });

  it("should allow empty optional address", () => {
    const result = parkingSiteSchema.safeParse({
      code: "SITE01",
      name: "Main Parking",
      address: ""
    });
    expect(result.success).toBe(true);
  });

  it("should validate maxCapacity >= 0", () => {
    const result = parkingSiteSchema.safeParse({
      code: "SITE01",
      name: "Main Parking",
      maxCapacity: -1
    });
    expect(result.success).toBe(false);
  });

  it("should allow maxCapacity = 0", () => {
    const result = parkingSiteSchema.safeParse({
      code: "SITE01",
      name: "Main Parking",
      maxCapacity: 0
    });
    expect(result.success).toBe(true);
  });
});

describe("paymentMethodSchema", () => {
  it("should validate valid payment method", () => {
    const data = {
      code: "CASH",
      name: "Cash Payment",
      requiresReference: false,
      isActive: true,
      displayOrder: 0
    };
    const result = paymentMethodSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should enforce uppercase code regex", () => {
    const result = paymentMethodSchema.safeParse({
      code: "cash",
      name: "Cash Payment"
    });
    expect(result.success).toBe(false);
  });

  it("should allow code with numbers and underscores", () => {
    const result = paymentMethodSchema.safeParse({
      code: "CARD_V2",
      name: "Card Payment V2"
    });
    expect(result.success).toBe(true);
  });

  it("should reject code with lowercase letters", () => {
    const result = paymentMethodSchema.safeParse({
      code: "Cash",
      name: "Cash Payment"
    });
    expect(result.success).toBe(false);
  });

  it("should reject code with special characters", () => {
    const result = paymentMethodSchema.safeParse({
      code: "CASH-PAYMENT",
      name: "Cash Payment"
    });
    expect(result.success).toBe(false);
  });

  it("should validate name length", () => {
    const result = paymentMethodSchema.safeParse({
      code: "CASH",
      name: "A".repeat(101)
    });
    expect(result.success).toBe(false);
  });

  it("should default requiresReference to false", () => {
    const result = paymentMethodSchema.safeParse({
      code: "CASH",
      name: "Cash"
    });
    if (result.success) {
      expect(result.data.requiresReference).toBe(false);
    }
  });

  it("should default displayOrder to 0", () => {
    const result = paymentMethodSchema.safeParse({
      code: "CASH",
      name: "Cash"
    });
    if (result.success) {
      expect(result.data.displayOrder).toBe(0);
    }
  });
});

describe("printerSchema", () => {
  it("should validate valid printer", () => {
    const data = {
      name: "Main Printer",
      type: "THERMAL",
      connection: "USB",
      paperWidthMm: 80,
      endpointOrDevice: "LPT1",
      isActive: true,
      isDefault: true
    };
    const result = printerSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should reject invalid printer type", () => {
    const result = printerSchema.safeParse({
      name: "Printer",
      type: "INVALID",
      connection: "USB"
    });
    expect(result.success).toBe(false);
  });

  it("should accept THERMAL type", () => {
    const result = printerSchema.safeParse({
      name: "Printer",
      type: "THERMAL",
      connection: "USB"
    });
    expect(result.success).toBe(true);
  });

  it("should accept PDF type", () => {
    const result = printerSchema.safeParse({
      name: "Printer",
      type: "PDF",
      connection: "LOCAL_AGENT"
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid connection types", () => {
    const connections = ["USB", "NET", "BLUETOOTH", "LOCAL_AGENT"];
    connections.forEach(connection => {
      const result = printerSchema.safeParse({
        name: "Printer",
        type: "THERMAL",
        connection
      });
      expect(result.success).toBe(true);
    });
  });

  it("should validate paperWidthMm only 58 or 80", () => {
    const result1 = printerSchema.safeParse({
      name: "Printer",
      type: "THERMAL",
      connection: "USB",
      paperWidthMm: 58
    });
    expect(result1.success).toBe(true);

    const result2 = printerSchema.safeParse({
      name: "Printer",
      type: "THERMAL",
      connection: "USB",
      paperWidthMm: 75
    });
    expect(result2.success).toBe(false);
  });

  it("should default paperWidthMm to 80", () => {
    const result = printerSchema.safeParse({
      name: "Printer",
      type: "THERMAL",
      connection: "USB"
    });
    if (result.success) {
      expect(result.data.paperWidthMm).toBe(80);
    }
  });
});

describe("operationalParameterSchema", () => {
  it("should validate with all defaults", () => {
    const result = operationalParameterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should validate custom values", () => {
    const data = {
      timezone: "America/New_York",
      allowEntryWithoutPrinter: true,
      allowExitWithoutPayment: false,
      allowReprint: true,
      allowVoid: true,
      requirePhotoEntry: false,
      requirePhotoExit: true,
      toleranceMinutes: 15,
      maxTimeNoCharge: 30,
      legalMessage: "Legal terms here",
      offlineModeEnabled: true
    };
    const result = operationalParameterSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should default allowReprint to true", () => {
    const result = operationalParameterSchema.safeParse({});
    if (result.success) {
      expect(result.data.allowReprint).toBe(true);
    }
  });

  it("should validate legalMessage max length", () => {
    const result = operationalParameterSchema.safeParse({
      legalMessage: "A".repeat(1001)
    });
    expect(result.success).toBe(false);
  });

  it("should validate toleranceMinutes >= 0", () => {
    const result = operationalParameterSchema.safeParse({
      toleranceMinutes: -1
    });
    expect(result.success).toBe(false);
  });

  it("should validate maxTimeNoCharge >= 0", () => {
    const result = operationalParameterSchema.safeParse({
      maxTimeNoCharge: -1
    });
    expect(result.success).toBe(false);
  });
});

describe("rateFractionSchema", () => {
  it("should validate valid rate fraction", () => {
    const data = {
      fromMinute: 0,
      toMinute: 30,
      value: 5000,
      roundUp: true,
      isActive: true
    };
    const result = rateFractionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should reject when fromMinute >= toMinute", () => {
    const result = rateFractionSchema.safeParse({
      fromMinute: 30,
      toMinute: 30,
      value: 5000
    });
    expect(result.success).toBe(false);
  });

  it("should reject when fromMinute > toMinute", () => {
    const result = rateFractionSchema.safeParse({
      fromMinute: 60,
      toMinute: 30,
      value: 5000
    });
    expect(result.success).toBe(false);
  });

  it("should allow fromMinute = 0", () => {
    const result = rateFractionSchema.safeParse({
      fromMinute: 0,
      toMinute: 30,
      value: 5000
    });
    expect(result.success).toBe(true);
  });

  it("should validate value >= 0", () => {
    const result = rateFractionSchema.safeParse({
      fromMinute: 0,
      toMinute: 30,
      value: -100
    });
    expect(result.success).toBe(false);
  });

  it("should default roundUp to true", () => {
    const result = rateFractionSchema.safeParse({
      fromMinute: 0,
      toMinute: 30,
      value: 5000
    });
    if (result.success) {
      expect(result.data.roundUp).toBe(true);
    }
  });
});

describe("cashRegisterSchema", () => {
  it("should validate valid cash register", () => {
    const data = {
      site: "MAIN",
      code: "REG001",
      terminal: "TERM1",
      name: "Main Register"
    };
    const result = cashRegisterSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should allow uuid for siteId", () => {
    const result = cashRegisterSchema.safeParse({
      site: "MAIN",
      siteId: "550e8400-e29b-41d4-a716-446655440000",
      code: "REG001",
      terminal: "TERM1"
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid uuid", () => {
    const result = cashRegisterSchema.safeParse({
      site: "MAIN",
      siteId: "not-a-uuid",
      code: "REG001",
      terminal: "TERM1"
    });
    expect(result.success).toBe(false);
  });

  it("should validate required fields", () => {
    const result = cashRegisterSchema.safeParse({
      site: "MAIN"
    });
    expect(result.success).toBe(false);
  });

  it("should default active to true", () => {
    const result = cashRegisterSchema.safeParse({
      site: "MAIN",
      code: "REG001",
      terminal: "TERM1"
    });
    if (result.success) {
      expect(result.data.active).toBe(true);
    }
  });
});

describe("vehicleTypeSchema", () => {
  it("should validate valid vehicle type", () => {
    const data = {
      code: "CAR",
      name: "Car",
      icon: "car",
      color: "#2563EB",
      requiresPlate: true,
      hasOwnRate: true,
      quickAccess: true,
      requiresPhoto: false,
      displayOrder: 0
    };
    const result = vehicleTypeSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("should enforce uppercase code regex", () => {
    const result = vehicleTypeSchema.safeParse({
      code: "car",
      name: "Car"
    });
    expect(result.success).toBe(false);
  });

  it("should validate hex color format", () => {
    const result1 = vehicleTypeSchema.safeParse({
      code: "CAR",
      name: "Car",
      color: "#2563EB"
    });
    expect(result1.success).toBe(true);

    const result2 = vehicleTypeSchema.safeParse({
      code: "CAR",
      name: "Car",
      color: "red"
    });
    expect(result2.success).toBe(false);
  });

  it("should default color to blue", () => {
    const result = vehicleTypeSchema.safeParse({
      code: "CAR",
      name: "Car"
    });
    if (result.success) {
      expect(result.data.color).toBe("#2563EB");
    }
  });

  it("should default requiresPlate to true", () => {
    const result = vehicleTypeSchema.safeParse({
      code: "CAR",
      name: "Car"
    });
    if (result.success) {
      expect(result.data.requiresPlate).toBe(true);
    }
  });

  it("should validate displayOrder >= 0", () => {
    const result = vehicleTypeSchema.safeParse({
      code: "CAR",
      name: "Car",
      displayOrder: -1
    });
    expect(result.success).toBe(false);
  });

  it("should allow code with numbers and underscores", () => {
    const result = vehicleTypeSchema.safeParse({
      code: "CAR_V2",
      name: "Car V2"
    });
    expect(result.success).toBe(true);
  });
});

describe("integration scenarios", () => {
  it("should validate complete parking configuration", () => {
    const siteResult = parkingSiteSchema.safeParse({
      code: "SITE01",
      name: "Main Parking",
      maxCapacity: 100
    });

    const paymentResult = paymentMethodSchema.safeParse({
      code: "CASH",
      name: "Cash"
    });

    const printerResult = printerSchema.safeParse({
      name: "Printer",
      type: "THERMAL",
      connection: "USB"
    });

    expect(siteResult.success).toBe(true);
    expect(paymentResult.success).toBe(true);
    expect(printerResult.success).toBe(true);
  });

  it("should handle multiple rate fractions for tiered pricing", () => {
    const fractions = [
      { fromMinute: 0, toMinute: 30, value: 5000 },
      { fromMinute: 30, toMinute: 60, value: 8000 },
      { fromMinute: 60, toMinute: 120, value: 10000 }
    ];

    fractions.forEach(fraction => {
      const result = rateFractionSchema.safeParse(fraction);
      expect(result.success).toBe(true);
    });
  });
});
