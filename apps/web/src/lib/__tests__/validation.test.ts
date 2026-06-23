import { describe, it, expect } from "vitest";
import {
  requiredString,
  emailSchema,
  phoneSchema,
  plateSchema,
  positiveNumber,
  nonNegativeNumber,
} from "@/lib/validation";

describe("requiredString", () => {
  it.each([
    ["Nombre requerido", "test"],
    ["Email requerido", "user@example.com"],
    ["Campo obligatorio", "value"],
    ["Inválido", "a"],
    ["Validar", "0"],
    ["Requerido", "1234567890"],
    ["Campo", "especial_chars"],
    ["Req", "spaces included"],
    ["M", "very long string with many words and characters"],
    ["X", "-"],
  ])("validates string with message '%p'", (message, input) => {
    const schema = requiredString(message);
    const result = schema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it.each([
    ["Requerido", ""],
    ["Campo obligatorio", null],
    ["Inválido", undefined],
  ])("rejects invalid input with message '%p'", (message, input) => {
    const schema = requiredString(message);
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("includes custom error message on failure", () => {
    const customMsg = "Por favor ingresa tu nombre";
    const schema = requiredString(customMsg);
    const result = schema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === customMsg)).toBe(true);
    }
  });

  it.each([
    ["msg1", "hello"],
    ["msg2", "world"],
    ["msg3", "test"],
    ["msg4", "verify"],
    ["msg5", "check"],
  ])("passes valid strings with message %p", (message, input) => {
    const schema = requiredString(message);
    expect(schema.safeParse(input).success).toBe(true);
  });

  it("rejects empty string", () => {
    const schema = requiredString("Required");
    expect(schema.safeParse("").success).toBe(false);
  });

  it("accepts whitespace-only strings", () => {
    const schema = requiredString("Required");
    const result = schema.safeParse("   ");
    expect(result.success).toBe(true);
  });

  it("rejects undefined", () => {
    const schema = requiredString("Required");
    const result = schema.safeParse(undefined);
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    const schema = requiredString("Required");
    const result = schema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("accepts strings with special characters", () => {
    const schema = requiredString("Required");
    expect(schema.safeParse("!@#$%^&*()").success).toBe(true);
  });

  it("accepts strings with unicode", () => {
    const schema = requiredString("Required");
    expect(schema.safeParse("español 中文 العربية").success).toBe(true);
  });
});

describe("emailSchema", () => {
  it.each([
    ["user@example.com"],
    ["test.email@domain.co.uk"],
    ["name+tag@company.com"],
    ["admin@localhost.local"],
    ["info@test.org"],
    ["contact@sub.domain.com"],
    ["123@example.com"],
    ["user.name@example.com"],
    ["a@b.co"],
    ["test123@domain456.io"],
  ])("validates email %p", (email) => {
    const result = emailSchema().safeParse(email);
    expect(result.success).toBe(true);
  });

  it.each([
    ["plainaddress"],
    ["@example.com"],
    ["user@"],
    ["user @example.com"],
    ["user@.com"],
    [""],
    ["user@domain"],
  ])("rejects invalid email %p", (email) => {
    const result = emailSchema().safeParse(email);
    expect(result.success).toBe(false);
  });

  it("uses default error message", () => {
    const result = emailSchema().safeParse("not-an-email");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("correo");
    }
  });

  it("uses custom error message", () => {
    const customMsg = "Email must be valid";
    const result = emailSchema(customMsg).safeParse("invalid");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(customMsg);
    }
  });

  it("rejects emails with multiple @ symbols", () => {
    const result = emailSchema().safeParse("user@test@example.com");
    expect(result.success).toBe(false);
  });
});

describe("phoneSchema", () => {
  it.each([
    ["3015551234"],
    ["+573015551234"],
    ["573015551234"],
    ["1234567"],
    ["+1234567890123"],
    ["9876543210"],
    ["+33123456789"],
    ["5551234567"],
  ])("validates phone %p", (phone) => {
    const result = phoneSchema().safeParse(phone);
    expect(result.success).toBe(true);
  });

  it.each([
    ["123"],
    ["12345"],
    ["abc1234567"],
    [""],
    ["123-456-7890"],
    ["(123) 456-7890"],
    ["+"],
    ["+1"],
    ["phone"],
  ])("rejects invalid phone %p", (phone) => {
    const result = phoneSchema().safeParse(phone);
    expect(result.success).toBe(false);
  });

  it("uses default error message", () => {
    const result = phoneSchema().safeParse("abc");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("teléfono");
    }
  });

  it("uses custom error message", () => {
    const customMsg = "Phone number invalid";
    const result = phoneSchema(customMsg).safeParse("abc");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(customMsg);
    }
  });

  it("accepts 7-digit minimum", () => {
    expect(phoneSchema().safeParse("1234567").success).toBe(true);
  });

  it("accepts 15-digit maximum", () => {
    expect(phoneSchema().safeParse("+123456789012345").success).toBe(true);
  });

  it("rejects 6-digit numbers", () => {
    expect(phoneSchema().safeParse("123456").success).toBe(false);
  });

  it("rejects 16-digit numbers", () => {
    expect(phoneSchema().safeParse("1234567890123456").success).toBe(false);
  });

  it("accepts + prefix", () => {
    expect(phoneSchema().safeParse("+1234567").success).toBe(true);
  });
});

describe("plateSchema", () => {
  it.each([
    ["AAA123"],
    ["ABC1234"],
    ["XYZ789"],
    ["AAA1234"],
    ["ZZZ9999"],
    ["NNN5555"],
    ["ABC123"],
    ["DEF456"],
    ["GHI789"],
    ["JKL012"],
  ])("validates plate %p", (plate) => {
    const result = plateSchema().safeParse(plate);
    expect(result.success).toBe(true);
  });

  it.each([
    ["AAAA"],
    ["AAA123456"],
    ["AA@123"],
    ["@@@123"],
    ["!!!!!!"],
  ])("rejects invalid plate %p", (plate) => {
    const result = plateSchema().safeParse(plate);
    expect(result.success).toBe(false);
  });

  it("converts lowercase to uppercase", () => {
    const result = plateSchema().safeParse("AAA123");
    expect(result.success).toBe(true);
  });

  it("uses default error message", () => {
    const result = plateSchema().safeParse("@@@@@@@");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("placa");
    }
  });

  it("uses custom error message", () => {
    const customMsg = "License plate format invalid";
    const result = plateSchema(customMsg).safeParse("!!!!!!");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(customMsg);
    }
  });

  it("accepts minimum 5 characters", () => {
    expect(plateSchema().safeParse("ABC12").success).toBe(true);
  });

  it("accepts maximum 7 characters", () => {
    expect(plateSchema().safeParse("ABC1234").success).toBe(true);
  });

  it("rejects 4 characters", () => {
    expect(plateSchema().safeParse("AB12").success).toBe(false);
  });

  it("rejects 8 characters", () => {
    expect(plateSchema().safeParse("ABC12345").success).toBe(false);
  });

  it("rejects plates with special characters", () => {
    expect(plateSchema().safeParse("AA@123").success).toBe(false);
  });

  it("accepts mixed alphanumeric", () => {
    expect(plateSchema().safeParse("A1B2C3D").success).toBe(true);
  });
});

describe("positiveNumber", () => {
  it.each([
    [0.1],
    [1],
    [1000],
    [3.14],
    [42],
    [999999],
  ])("validates positive number %p", (num) => {
    const result = positiveNumber("Must be positive").safeParse(num);
    expect(result.success).toBe(true);
  });

  it.each([
    [0],
    [-1],
    [-1000],
    [-3.14],
  ])("rejects invalid %p", (input) => {
    const result = positiveNumber("Must be positive").safeParse(input);
    expect(result.success).toBe(false);
  });

  it("uses custom error message", () => {
    const customMsg = "Debe ser mayor a cero";
    const result = positiveNumber(customMsg).safeParse(0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === customMsg)).toBe(true);
    }
  });

  it("rejects zero", () => {
    expect(positiveNumber("Required").safeParse(0).success).toBe(false);
  });

  it("rejects negative numbers", () => {
    expect(positiveNumber("Required").safeParse(-1).success).toBe(false);
    expect(positiveNumber("Required").safeParse(-100).success).toBe(false);
  });

  it("accepts very small positive numbers", () => {
    expect(positiveNumber("Required").safeParse(0.0000001).success).toBe(true);
  });

  it("accepts very large positive numbers", () => {
    expect(positiveNumber("Required").safeParse(Number.MAX_SAFE_INTEGER).success).toBe(true);
  });

  it("rejects NaN", () => {
    expect(positiveNumber("Required").safeParse(NaN).success).toBe(false);
  });
});

describe("nonNegativeNumber", () => {
  it.each([
    [0],
    [1],
    [1000],
    [3.14],
    [42],
    [999999],
  ])("validates non-negative number %p", (num) => {
    const result = nonNegativeNumber("Must be non-negative").safeParse(num);
    expect(result.success).toBe(true);
  });

  it.each([
    [-1],
    [-1000],
    [-3.14],
  ])("rejects invalid %p", (input) => {
    const result = nonNegativeNumber("Must be non-negative").safeParse(input);
    expect(result.success).toBe(false);
  });

  it("uses custom error message", () => {
    const customMsg = "Debe ser mayor o igual a cero";
    const result = nonNegativeNumber(customMsg).safeParse(-1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === customMsg)).toBe(true);
    }
  });

  it("accepts zero", () => {
    expect(nonNegativeNumber("Required").safeParse(0).success).toBe(true);
  });

  it("accepts positive numbers", () => {
    expect(nonNegativeNumber("Required").safeParse(1).success).toBe(true);
    expect(nonNegativeNumber("Required").safeParse(100).success).toBe(true);
  });

  it("rejects negative numbers", () => {
    expect(nonNegativeNumber("Required").safeParse(-1).success).toBe(false);
    expect(nonNegativeNumber("Required").safeParse(-100).success).toBe(false);
  });

  it("accepts very small non-negative numbers", () => {
    expect(nonNegativeNumber("Required").safeParse(0.0000001).success).toBe(true);
  });

  it("accepts very large non-negative numbers", () => {
    expect(nonNegativeNumber("Required").safeParse(Number.MAX_SAFE_INTEGER).success).toBe(true);
  });

  it("rejects NaN", () => {
    expect(nonNegativeNumber("Required").safeParse(NaN).success).toBe(false);
  });

  it("accepts boundary case: 0.0", () => {
    expect(nonNegativeNumber("Required").safeParse(0.0).success).toBe(true);
  });
});

describe("Validation integration tests", () => {
  it("can validate complete company form", () => {
    const companySchema = {
      name: requiredString("Nombre requerido"),
      email: emailSchema("Email inválido"),
      phone: phoneSchema("Teléfono inválido"),
    };

    const data = {
      name: "Estacionamiento Central",
      email: "admin@parkflow.com",
      phone: "3015551234",
    };

    expect(companySchema.name.safeParse(data.name).success).toBe(true);
    expect(companySchema.email.safeParse(data.email).success).toBe(true);
    expect(companySchema.phone.safeParse(data.phone).success).toBe(true);
  });

  it("validates parking configuration", () => {
    const configSchema = {
      siteName: requiredString("Nombre requerido"),
      capacity: nonNegativeNumber("Debe ser ≥ 0"),
      hourlyRate: positiveNumber("Debe ser > 0"),
    };

    const config = {
      siteName: "Parqueadero Centro",
      capacity: 100,
      hourlyRate: 5000,
    };

    expect(configSchema.siteName.safeParse(config.siteName).success).toBe(true);
    expect(configSchema.capacity.safeParse(config.capacity).success).toBe(true);
    expect(configSchema.hourlyRate.safeParse(config.hourlyRate).success).toBe(true);
  });

  it("validates vehicle registration", () => {
    const vehicleSchema = {
      plate: plateSchema("Placa inválida"),
      ownerEmail: emailSchema("Email inválido"),
      phone: phoneSchema("Teléfono inválido"),
    };

    const vehicle = {
      plate: "ABC1234",
      ownerEmail: "owner@example.com",
      phone: "3015551234",
    };

    expect(vehicleSchema.plate.safeParse(vehicle.plate).success).toBe(true);
    expect(vehicleSchema.ownerEmail.safeParse(vehicle.ownerEmail).success).toBe(true);
    expect(vehicleSchema.phone.safeParse(vehicle.phone).success).toBe(true);
  });
});
