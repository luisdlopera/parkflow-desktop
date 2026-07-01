import { errorService } from "../error-service";

describe("errorService.normalize", () => {
  it("returns correct message for known error codes", () => {
    const pfError = errorService.normalize({ code: "AUTH_SESSION_EXPIRED", status: 401 });
    expect(pfError.message).toMatch(/inicia sesión nuevamente/);
  });

  it("returns HTTP-based message for 400 status", () => {
    const pfError = errorService.normalize({ status: 400 });
    expect(pfError.message).toMatch(/no pudimos identificar/);
  });

  it("returns HTTP-based message for 401 status", () => {
    const pfError = errorService.normalize({ status: 401 });
    expect(pfError.message).toMatch(/inicia sesión nuevamente/);
  });

  it("returns HTTP-based message for 403 status", () => {
    const pfError = errorService.normalize({ status: 403 });
    expect(pfError.message).toMatch(/No tienes permisos/);
  });

  it("returns HTTP-based message for 404 status", () => {
    const pfError = errorService.normalize({ status: 404 });
    expect(pfError.message).toMatch(/no existe/);
  });

  it("returns HTTP-based message for 409 status", () => {
    const pfError = errorService.normalize({ status: 409 });
    expect(pfError.message).toMatch(/registro ya existe/);
  });

  it("returns HTTP-based message for 500 status", () => {
    const pfError = errorService.normalize({ status: 500 });
    expect(pfError.message).toMatch(/error inesperado/);
  });

  it("returns userMessage from object when provided", () => {
    const pfError = errorService.normalize({ userMessage: "Mensaje amigable del usuario" });
    expect(pfError.message).toBe("Mensaje amigable del usuario");
  });

  it("uses status-based message for unknown error codes", () => {
    const pfError = errorService.normalize({ status: 400 });
    expect(pfError.message).toMatch(/no pudimos identificar/);
  });

  it("handles string errors", () => {
    const pfError = errorService.normalize("some string");
    expect(pfError.message).toBe("some string");
  });

  it("handles Error instances", () => {
    const pfError = errorService.normalize(new Error("Test error"));
    expect(pfError.message).toBe("Test error");
  });

  it("handles network errors", () => {
    const pfError = errorService.normalize(new TypeError("Failed to fetch"));
    expect(pfError.title).toMatch(/Sin conexión/);
    expect(pfError.message).toMatch(/conectar con el servidor/);
  });

  it("handles null gracefully", () => {
    const pfError = errorService.normalize(null);
    expect(pfError.code).toBeDefined();
  });
});
