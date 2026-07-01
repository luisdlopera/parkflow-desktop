import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/ApiError";
import { applyApiErrorToForm } from "@/hooks/useFormErrorHandling";

describe("applyApiErrorToForm", () => {
  it("maps backend validation issues to form field errors", () => {
    const setError = vi.fn();
    const form = { setError } as any;
    const error = new ApiError(
      422,
      "VALIDATION_ERROR",
      "Datos inválidos",
      "/api/v1/auth/login",
      "trace-1",
      [
        { field: "email", code: "NOT_BLANK", message: "El correo es obligatorio", rejectedValue: "" },
        { field: "password", code: "MIN_LENGTH", message: "La contraseña es muy corta", rejectedValue: "123" },
      ],
    );

    const applied = applyApiErrorToForm(form, error);

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledWith("email", expect.objectContaining({ message: "El correo es obligatorio" }));
    expect(setError).toHaveBeenCalledWith("password", expect.objectContaining({ message: "La contraseña es muy corta" }));
  });

  it("ignores non ApiError values", () => {
    const setError = vi.fn();
    const form = { setError } as any;

    const applied = applyApiErrorToForm(form, new Error("boom"));

    expect(applied).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it("handles multiple validation errors at once", () => {
    const setError = vi.fn();
    const form = { setError } as any;
    const error = new ApiError(
      422,
      "VALIDATION_ERROR",
      "Multiple validation errors",
      "/api/v1/test",
      "trace-2",
      [
        { field: "name", code: "NOT_BLANK", message: "Name is required", rejectedValue: "" },
        { field: "age", code: "MIN", message: "Must be at least 18", rejectedValue: "10" },
        { field: "email", code: "INVALID_FORMAT", message: "Invalid email format", rejectedValue: "test" },
      ],
    );

    const applied = applyApiErrorToForm(form, error);

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledTimes(3);
  });

  it("handles validation errors without field code info", () => {
    const setError = vi.fn();
    const form = { setError } as any;
    const error = new ApiError(
      422,
      "VALIDATION_ERROR",
      "Validation failed",
      "/api/v1/test",
      "trace-3",
      [],
    );

    const applied = applyApiErrorToForm(form, error);

    expect(applied).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});
