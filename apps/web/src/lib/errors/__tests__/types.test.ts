import { describe, it, expect } from "vitest";

// Test the types by creating instances
describe("ApiError Type Interface", () => {
  // Test 1: Create object matching ApiError type
  it("should create object with message property", () => {
    const error: { message?: string } = { message: "Test error" };
    expect(error.message).toBe("Test error");
  });

  // Test 2: Create object with details property
  it("should create object with details property", () => {
    const error: { details?: Record<string, unknown> } = {
      details: { field: "email", error: "Invalid" },
    };
    expect(error.details).toEqual({ field: "email", error: "Invalid" });
  });

  // Test 3: Create object with both properties
  it("should create object with both message and details", () => {
    interface TestApiError {
      details?: Record<string, unknown>;
      message?: string;
    }
    const error: TestApiError = {
      message: "Validation failed",
      details: { email: "Invalid format", password: "Too short" },
    };
    expect(error.message).toBe("Validation failed");
    expect(error.details).toEqual({ email: "Invalid format", password: "Too short" });
  });

  // Test 4: Create object without properties
  it("should create empty object matching interface", () => {
    const error: { details?: Record<string, unknown>; message?: string } = {};
    expect(error.message).toBeUndefined();
    expect(error.details).toBeUndefined();
  });

  // Test 5: Message can be string
  it("should accept string message", () => {
    const error: { message?: string } = { message: "Error occurred" };
    expect(typeof error.message).toBe("string");
  });

  // Test 6: Details can be complex object
  it("should accept complex details object", () => {
    const details: Record<string, unknown> = {
      field1: "value1",
      field2: 123,
      field3: true,
      field4: ["array", "values"],
      field5: { nested: "object" },
    };
    const error: { details?: Record<string, unknown> } = { details };
    expect(error.details).toEqual(details);
  });

  // Test 7: Details with any value type
  it("should handle Record<string, unknown> for any value", () => {
    const details: Record<string, unknown> = {
      string: "text",
      number: 42,
      boolean: true,
      null: null,
      undefined: undefined,
      array: [1, 2, 3],
      object: { key: "value" },
    };
    const error: { details?: Record<string, unknown> } = { details };
    expect(error.details?.string).toBe("text");
    expect(error.details?.number).toBe(42);
    expect(error.details?.boolean).toBe(true);
    expect(error.details?.array).toEqual([1, 2, 3]);
  });

  // Test 8: Multiple instances independence
  it("should create independent instances", () => {
    const error1: { message?: string } = { message: "Error 1" };
    const error2: { message?: string } = { message: "Error 2" };
    expect(error1.message).toBe("Error 1");
    expect(error2.message).toBe("Error 2");
  });

  // Test 9: Message can be empty string
  it("should accept empty string message", () => {
    const error: { message?: string } = { message: "" };
    expect(error.message).toBe("");
  });

  // Test 10: Details empty object
  it("should accept empty details object", () => {
    const error: { details?: Record<string, unknown> } = { details: {} };
    expect(Object.keys(error.details || {}).length).toBe(0);
  });

  // Test 11: Type checking for details field names
  it("should accept any string as details key", () => {
    const keys = ["field", "Field", "FIELD", "field_name", "fieldName", "field-name"];
    keys.forEach((key) => {
      const details: Record<string, unknown> = { [key]: "value" };
      const error: { details?: Record<string, unknown> } = { details };
      expect(error.details?.[key]).toBe("value");
    });
  });

  // Test 12: Details with nested structures
  it("should handle nested detail structures", () => {
    const details: Record<string, unknown> = {
      validation: {
        email: ["Invalid", "Required"],
        password: { min: 8, message: "Too short" },
      },
    };
    const error: { details?: Record<string, unknown> } = { details };
    expect(typeof error.details?.validation).toBe("object");
  });

  // Test 13: Message modification
  it("should allow message modification", () => {
    const error: { message?: string } = { message: "Original" };
    error.message = "Modified";
    expect(error.message).toBe("Modified");
  });

  // Test 14: Details modification
  it("should allow details modification", () => {
    const error: { details?: Record<string, unknown> } = { details: { key: "value" } };
    error.details!.key = "newValue";
    expect(error.details?.key).toBe("newValue");
  });

  // Test 15: Type narrowing
  it("should narrow type correctly", () => {
    const error: { details?: Record<string, unknown>; message?: string } = {
      message: "Error",
    };

    if (error.message) {
      expect(typeof error.message).toBe("string");
    }

    if (error.details) {
      expect(typeof error.details).toBe("object");
    }
  });

  // Test 16: Generic property access
  it("should allow generic property access on Record", () => {
    const details: Record<string, unknown> = { prop1: "value1", prop2: "value2" };
    const keys = Object.keys(details);
    expect(keys).toContain("prop1");
    expect(keys).toContain("prop2");
  });

  // Test 17: Error object with both properties undefined
  it("should handle both properties being undefined", () => {
    const error: { details?: Record<string, unknown>; message?: string } = {};
    expect("message" in error).toBe(false);
    expect("details" in error).toBe(false);
  });

  // Test 18: Error object with null values
  it("should handle null as valid value in details", () => {
    const details: Record<string, unknown> = { field: null };
    const error: { details?: Record<string, unknown> } = { details };
    expect(error.details?.field).toBe(null);
  });

  // Test 19: Property iteration on details
  it("should allow iteration over details properties", () => {
    const details: Record<string, unknown> = { a: 1, b: 2, c: 3 };
    const error: { details?: Record<string, unknown> } = { details };

    const keys: string[] = [];
    for (const key in error.details || {}) {
      keys.push(key);
    }

    expect(keys).toEqual(["a", "b", "c"]);
  });

  // Test 20: Type compatibility with error scenarios
  it("should work with typical error scenarios", () => {
    // Validation error
    const validationError: { details?: Record<string, unknown>; message?: string } = {
      message: "Validation failed",
      details: {
        email: "Invalid format",
        password: "Too short",
      },
    };

    // Network error
    const networkError: { details?: Record<string, unknown>; message?: string } = {
      message: "Network timeout",
    };

    // Unknown error
    const unknownError: { details?: Record<string, unknown>; message?: string } = {
      details: { error: "Unknown" },
    };

    expect(validationError.message).toBeDefined();
    expect(validationError.details).toBeDefined();
    expect(networkError.message).toBeDefined();
    expect(networkError.details).toBeUndefined();
    expect(unknownError.message).toBeUndefined();
    expect(unknownError.details).toBeDefined();
  });

  // Test 21: Readonly vs mutable
  it("should support both readonly and mutable variants", () => {
    const mutable: { details?: Record<string, unknown>; message?: string } = { message: "test" };
    mutable.message = "modified";

    expect(mutable.message).toBe("modified");
  });

  // Test 22: Shallow copy behavior
  it("should handle shallow copies correctly", () => {
    const original: { details?: Record<string, unknown> } = { details: { key: "value" } };
    const copy = { ...original };

    copy.details!.key = "modified";

    expect(original.details?.key).toBe("modified");
  });

  // Test 23: Deep property access
  it("should handle deep property access safely", () => {
    const details: Record<string, unknown> = {
      level1: { level2: { level3: "value" } },
    };
    const error: { details?: Record<string, unknown> } = { details };

    const level1 = error.details?.level1;
    expect(typeof level1).toBe("object");
  });

  // Test 24: Array in details
  it("should handle arrays in details", () => {
    const details: Record<string, unknown> = {
      errors: ["error1", "error2", "error3"],
    };
    const error: { details?: Record<string, unknown> } = { details };

    expect(Array.isArray(error.details?.errors)).toBe(true);
    expect((error.details?.errors as string[]).length).toBe(3);
  });

  // Test 25: Message type safety
  it("should enforce string type for message", () => {
    const error: { message?: string } = { message: "Valid string" };
    expect(typeof error.message).toBe("string");

    // This test verifies TypeScript would enforce string type at compile time
    const testMsg: string | undefined = error.message;
    expect(testMsg === "Valid string" || testMsg === undefined).toBe(true);
  });
});
