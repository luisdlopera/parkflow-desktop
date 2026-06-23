import { describe, it, expect } from "vitest";
import { ErrorCode } from "../error-codes";

describe("ErrorCode Enum", () => {
  // Test 1: AUTH_INVALID_CREDENTIALS exists
  it("should have AUTH_INVALID_CREDENTIALS code", () => {
    expect(ErrorCode.AUTH_INVALID_CREDENTIALS).toBe("AUTH_INVALID_CREDENTIALS");
  });

  // Test 2: AUTH_SESSION_EXPIRED exists
  it("should have AUTH_SESSION_EXPIRED code", () => {
    expect(ErrorCode.AUTH_SESSION_EXPIRED).toBe("AUTH_SESSION_EXPIRED");
  });

  // Test 3: ACCESS_DENIED exists
  it("should have ACCESS_DENIED code", () => {
    expect(ErrorCode.ACCESS_DENIED).toBe("ACCESS_DENIED");
  });

  // Test 4: COMPANY_NOT_FOUND exists
  it("should have COMPANY_NOT_FOUND code", () => {
    expect(ErrorCode.COMPANY_NOT_FOUND).toBe("COMPANY_NOT_FOUND");
  });

  // Test 5: COMPANY_NAME_REQUIRED exists
  it("should have COMPANY_NAME_REQUIRED code", () => {
    expect(ErrorCode.COMPANY_NAME_REQUIRED).toBe("COMPANY_NAME_REQUIRED");
  });

  // Test 6: COMPANY_ALREADY_EXISTS exists
  it("should have COMPANY_ALREADY_EXISTS code", () => {
    expect(ErrorCode.COMPANY_ALREADY_EXISTS).toBe("COMPANY_ALREADY_EXISTS");
  });

  // Test 7: USER_EMAIL_ALREADY_EXISTS exists
  it("should have USER_EMAIL_ALREADY_EXISTS code", () => {
    expect(ErrorCode.USER_EMAIL_ALREADY_EXISTS).toBe("USER_EMAIL_ALREADY_EXISTS");
  });

  // Test 8: LICENSE_EXPIRED exists
  it("should have LICENSE_EXPIRED code", () => {
    expect(ErrorCode.LICENSE_EXPIRED).toBe("LICENSE_EXPIRED");
  });

  // Test 9: LICENSE_DISABLED exists
  it("should have LICENSE_DISABLED code", () => {
    expect(ErrorCode.LICENSE_DISABLED).toBe("LICENSE_DISABLED");
  });

  // Test 10: PARKING_RATE_NOT_FOUND exists
  it("should have PARKING_RATE_NOT_FOUND code", () => {
    expect(ErrorCode.PARKING_RATE_NOT_FOUND).toBe("PARKING_RATE_NOT_FOUND");
  });

  // Test 11: VEHICLE_PLATE_REQUIRED exists
  it("should have VEHICLE_PLATE_REQUIRED code", () => {
    expect(ErrorCode.VEHICLE_PLATE_REQUIRED).toBe("VEHICLE_PLATE_REQUIRED");
  });

  // Test 12: TICKET_NOT_FOUND exists
  it("should have TICKET_NOT_FOUND code", () => {
    expect(ErrorCode.TICKET_NOT_FOUND).toBe("TICKET_NOT_FOUND");
  });

  // Test 13: PRINT_AGENT_UNAVAILABLE exists
  it("should have PRINT_AGENT_UNAVAILABLE code", () => {
    expect(ErrorCode.PRINT_AGENT_UNAVAILABLE).toBe("PRINT_AGENT_UNAVAILABLE");
  });

  // Test 14: OPERATION_ERROR exists
  it("should have OPERATION_ERROR code", () => {
    expect(ErrorCode.OPERATION_ERROR).toBe("OPERATION_ERROR");
  });

  // Test 15: VALIDATION_ERROR exists
  it("should have VALIDATION_ERROR code", () => {
    expect(ErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
  });

  // Test 16: RESOURCE_NOT_FOUND exists
  it("should have RESOURCE_NOT_FOUND code", () => {
    expect(ErrorCode.RESOURCE_NOT_FOUND).toBe("RESOURCE_NOT_FOUND");
  });

  // Test 17: DATABASE_CONSTRAINT_ERROR exists
  it("should have DATABASE_CONSTRAINT_ERROR code", () => {
    expect(ErrorCode.DATABASE_CONSTRAINT_ERROR).toBe("DATABASE_CONSTRAINT_ERROR");
  });

  // Test 18: INTERNAL_ERROR exists
  it("should have INTERNAL_ERROR code", () => {
    expect(ErrorCode.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
  });

  // Test 19: NETWORK_ERROR exists
  it("should have NETWORK_ERROR code", () => {
    expect(ErrorCode.NETWORK_ERROR).toBe("NETWORK_ERROR");
  });

  // Test 20: UNKNOWN_ERROR exists
  it("should have UNKNOWN_ERROR code", () => {
    expect(ErrorCode.UNKNOWN_ERROR).toBe("UNKNOWN_ERROR");
  });

  // Test 21: All error codes are unique
  it("should have unique error codes", () => {
    const codes = Object.values(ErrorCode);
    const uniqueCodes = new Set(codes);
    expect(codes.length).toBe(uniqueCodes.size);
  });

  // Test 22: All error codes are strings
  it("should all be string values", () => {
    Object.values(ErrorCode).forEach((code) => {
      expect(typeof code).toBe("string");
    });
  });

  // Test 23: Auth codes are distinct
  it("should have distinct auth error codes", () => {
    expect(ErrorCode.AUTH_INVALID_CREDENTIALS).not.toBe(ErrorCode.AUTH_SESSION_EXPIRED);
    expect(ErrorCode.AUTH_SESSION_EXPIRED).not.toBe(ErrorCode.ACCESS_DENIED);
  });

  // Test 24: System error codes are distinct
  it("should have distinct system error codes", () => {
    expect(ErrorCode.OPERATION_ERROR).not.toBe(ErrorCode.VALIDATION_ERROR);
    expect(ErrorCode.VALIDATION_ERROR).not.toBe(ErrorCode.RESOURCE_NOT_FOUND);
    expect(ErrorCode.RESOURCE_NOT_FOUND).not.toBe(ErrorCode.DATABASE_CONSTRAINT_ERROR);
    expect(ErrorCode.DATABASE_CONSTRAINT_ERROR).not.toBe(ErrorCode.INTERNAL_ERROR);
  });

  // Test 25: Enum members count
  it("should have expected number of error codes", () => {
    const codes = Object.keys(ErrorCode);
    expect(codes.length).toBeGreaterThan(15);
  });

  // Test 26: Error code patterns are consistent
  it("should follow consistent naming pattern", () => {
    Object.values(ErrorCode).forEach((code) => {
      expect(code).toMatch(/^[A-Z_]+$/);
    });
  });

  // Test 27: Company related codes
  it("should have all company-related codes", () => {
    expect(ErrorCode.COMPANY_NOT_FOUND).toBeDefined();
    expect(ErrorCode.COMPANY_NAME_REQUIRED).toBeDefined();
    expect(ErrorCode.COMPANY_ALREADY_EXISTS).toBeDefined();
  });

  // Test 28: License related codes
  it("should have all license-related codes", () => {
    expect(ErrorCode.LICENSE_EXPIRED).toBeDefined();
    expect(ErrorCode.LICENSE_DISABLED).toBeDefined();
  });

  // Test 29: Parking related codes
  it("should have parking-related codes", () => {
    expect(ErrorCode.PARKING_RATE_NOT_FOUND).toBeDefined();
    expect(ErrorCode.VEHICLE_PLATE_REQUIRED).toBeDefined();
    expect(ErrorCode.TICKET_NOT_FOUND).toBeDefined();
  });

  // Test 30: Frontend specific codes
  it("should have frontend-specific codes", () => {
    expect(ErrorCode.NETWORK_ERROR).toBeDefined();
    expect(ErrorCode.UNKNOWN_ERROR).toBeDefined();
  });
});
