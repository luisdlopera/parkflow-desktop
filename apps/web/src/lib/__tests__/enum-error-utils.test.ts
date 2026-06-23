import { describe, it, expect } from "vitest";
import { PAYMENT_METHOD_CATALOG } from "../payment-method-catalog";

// Enum utilities for looking up catalog values

function getPaymentMethodLabel(code: string): string {
  const method = PAYMENT_METHOD_CATALOG.find(m => m.code === code);
  return method?.label || "Desconocido";
}

function getPaymentMethodHint(code: string): string {
  const method = PAYMENT_METHOD_CATALOG.find(m => m.code === code);
  return method?.hint || "";
}

function getPaymentMethodTone(code: string): string {
  const method = PAYMENT_METHOD_CATALOG.find(m => m.code === code);
  return method?.tone || "";
}

function requiresPaymentReference(code: string): boolean {
  const method = PAYMENT_METHOD_CATALOG.find(m => m.code === code);
  return method?.requiresReference ?? false;
}

function isAvailableInOnboarding(code: string): boolean {
  const method = PAYMENT_METHOD_CATALOG.find(m => m.code === code);
  return method?.availableInOnboarding ?? false;
}

// Error mapping utilities
function getHttpStatusMessage(status: number): string {
  const messages: Record<number, string> = {
    400: "Solicitud inválida",
    401: "No autorizado",
    403: "Acceso prohibido",
    404: "No encontrado",
    409: "Conflicto",
    422: "Datos inválidos",
    429: "Demasiadas solicitudes",
    500: "Error del servidor",
    502: "Gateway inválido",
    503: "Servicio no disponible",
  };
  return messages[status] || "Error desconocido";
}

function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

function isServerError(status: number): boolean {
  return status >= 500 && status < 600;
}

function isSuccessful(status: number): boolean {
  return status >= 200 && status < 300;
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

// Vehicle type translations
const vehicleTypeMap: Record<string, string> = {
  CAR: "carro",
  MOTORCYCLE: "moto",
  VAN: "van",
  TRUCK: "camión",
  BUS: "bus",
  BICYCLE: "bicicleta",
  ELECTRIC: "eléctrico",
  OTHER: "otro",
};

function translateVehicleType(code: string): string {
  return vehicleTypeMap[code] || "vehículo";
}

function vehicleTypeExists(code: string): boolean {
  return code in vehicleTypeMap;
}

// User role translations
const roleMap: Record<string, string> = {
  SUPER_ADMIN: "Súper administrador",
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  CAJERO: "Cajero",
  OPERADOR: "Operador",
};

function getRoleLabel(role: string): string {
  return roleMap[role] || role;
}

// Rate type translations
const rateTypeMap: Record<string, string> = {
  HOURLY: "Tarifa por hora",
  FRACTION: "Tarifa fraccional",
  DAILY: "Tarifa diaria",
  FLAT: "Tarifa fija",
};

function getRateTypeLabel(type: string): string {
  return rateTypeMap[type] || type;
}

// Status translations
const statusMap: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  PENDING: "Pendiente",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
  SUSPENDED: "Suspendido",
  BLOCKED: "Bloqueado",
  EXPIRED: "Expirado",
};

function getStatusLabel(status: string): string {
  return statusMap[status] || status;
}

// Payment status
const paymentStatusMap: Record<string, string> = {
  PENDING: "Pendiente de pago",
  PAID: "Pagado",
  OVERDUE: "Vencido",
  PARTIAL: "Pago parcial",
  VOIDED: "Cancelado",
};

function getPaymentStatusLabel(status: string): string {
  return paymentStatusMap[status] || status;
}

describe("getPaymentMethodLabel", () => {
  it.each([
    { code: "CASH", expected: "Efectivo" },
    { code: "DEBIT_CARD", expected: "Tarjeta débito" },
    { code: "CREDIT_CARD", expected: "Tarjeta crédito" },
    { code: "QR", expected: "QR" },
    { code: "NEQUI", expected: "Nequi" },
    { code: "DAVIPLATA", expected: "Daviplata" },
    { code: "TRANSFER", expected: "Transferencia" },
    { code: "AGREEMENT", expected: "Convenio" },
    { code: "INTERNAL_CREDIT", expected: "Crédito interno" },
    { code: "OTHER", expected: "Otro" },
    { code: "MIXED", expected: "Mixto" },
    { code: "INVALID", expected: "Desconocido" },
  ])("returns label for $code", ({ code, expected }) => {
    expect(getPaymentMethodLabel(code)).toBe(expected);
  });
});

describe("getPaymentMethodHint", () => {
  it.each([
    { code: "CASH", expectedContains: "Cambio" },
    { code: "DEBIT_CARD", expectedContains: "débito" },
    { code: "NEQUI", expectedContains: "Referencia" },
  ])("returns hint for $code", ({ code, expectedContains }) => {
    expect(getPaymentMethodHint(code)).toContain(expectedContains);
  });

  it("returns empty string for unknown code", () => {
    expect(getPaymentMethodHint("UNKNOWN")).toBe("");
  });
});

describe("getPaymentMethodTone", () => {
  it("returns tone styling for known payment methods", () => {
    const tone = getPaymentMethodTone("CASH");
    expect(tone).toContain("bg-emerald");
  });

  it("returns empty string for unknown code", () => {
    expect(getPaymentMethodTone("UNKNOWN")).toBe("");
  });
});

describe("requiresPaymentReference", () => {
  it.each([
    { code: "CASH", expected: false },
    { code: "DEBIT_CARD", expected: false },
    { code: "NEQUI", expected: true },
    { code: "DAVIPLATA", expected: true },
    { code: "TRANSFER", expected: true },
    { code: "INVALID", expected: false },
  ])("correctly determines if $code requires reference", ({ code, expected }) => {
    expect(requiresPaymentReference(code)).toBe(expected);
  });
});

describe("isAvailableInOnboarding", () => {
  it.each([
    { code: "CASH", expected: true },
    { code: "CREDIT_CARD", expected: true },
    { code: "INTERNAL_CREDIT", expected: false },
    { code: "OTHER", expected: false },
    { code: "INVALID", expected: false },
  ])("correctly determines if $code available in onboarding", ({ code, expected }) => {
    expect(isAvailableInOnboarding(code)).toBe(expected);
  });
});

describe("getHttpStatusMessage", () => {
  it.each([
    { status: 400, expected: "Solicitud inválida" },
    { status: 401, expected: "No autorizado" },
    { status: 403, expected: "Acceso prohibido" },
    { status: 404, expected: "No encontrado" },
    { status: 409, expected: "Conflicto" },
    { status: 500, expected: "Error del servidor" },
    { status: 503, expected: "Servicio no disponible" },
    { status: 999, expected: "Error desconocido" },
  ])("returns message for status $status", ({ status, expected }) => {
    expect(getHttpStatusMessage(status)).toBe(expected);
  });
});

describe("isClientError", () => {
  it.each([
    { status: 400, expected: true },
    { status: 404, expected: true },
    { status: 422, expected: true },
    { status: 200, expected: false },
    { status: 500, expected: false },
  ])("correctly identifies client error: $status", ({ status, expected }) => {
    expect(isClientError(status)).toBe(expected);
  });
});

describe("isServerError", () => {
  it.each([
    { status: 500, expected: true },
    { status: 502, expected: true },
    { status: 599, expected: true },
    { status: 404, expected: false },
    { status: 200, expected: false },
  ])("correctly identifies server error: $status", ({ status, expected }) => {
    expect(isServerError(status)).toBe(expected);
  });
});

describe("isSuccessful", () => {
  it.each([
    { status: 200, expected: true },
    { status: 201, expected: true },
    { status: 204, expected: true },
    { status: 199, expected: false },
    { status: 300, expected: false },
    { status: 400, expected: false },
  ])("correctly identifies successful: $status", ({ status, expected }) => {
    expect(isSuccessful(status)).toBe(expected);
  });
});

describe("isRedirect", () => {
  it.each([
    { status: 300, expected: true },
    { status: 301, expected: true },
    { status: 302, expected: true },
    { status: 200, expected: false },
    { status: 400, expected: false },
  ])("correctly identifies redirect: $status", ({ status, expected }) => {
    expect(isRedirect(status)).toBe(expected);
  });
});

describe("translateVehicleType", () => {
  it.each([
    { code: "CAR", expected: "carro" },
    { code: "MOTORCYCLE", expected: "moto" },
    { code: "VAN", expected: "van" },
    { code: "TRUCK", expected: "camión" },
    { code: "BUS", expected: "bus" },
    { code: "BICYCLE", expected: "bicicleta" },
    { code: "ELECTRIC", expected: "eléctrico" },
    { code: "OTHER", expected: "otro" },
    { code: "UNKNOWN", expected: "vehículo" },
  ])("translates $code to '$expected'", ({ code, expected }) => {
    expect(translateVehicleType(code)).toBe(expected);
  });
});

describe("vehicleTypeExists", () => {
  it.each([
    { code: "CAR", expected: true },
    { code: "MOTORCYCLE", expected: true },
    { code: "UNKNOWN", expected: false },
  ])("correctly checks vehicle type existence: $code", ({ code, expected }) => {
    expect(vehicleTypeExists(code)).toBe(expected);
  });
});

describe("getRoleLabel", () => {
  it.each([
    { role: "SUPER_ADMIN", expected: "Súper administrador" },
    { role: "ADMIN", expected: "Administrador" },
    { role: "SUPERVISOR", expected: "Supervisor" },
    { role: "CAJERO", expected: "Cajero" },
    { role: "OPERADOR", expected: "Operador" },
    { role: "UNKNOWN", expected: "UNKNOWN" },
  ])("translates $role to '$expected'", ({ role, expected }) => {
    expect(getRoleLabel(role)).toBe(expected);
  });
});

describe("getRateTypeLabel", () => {
  it.each([
    { type: "HOURLY", expected: "Tarifa por hora" },
    { type: "FRACTION", expected: "Tarifa fraccional" },
    { type: "DAILY", expected: "Tarifa diaria" },
    { type: "FLAT", expected: "Tarifa fija" },
    { type: "UNKNOWN", expected: "UNKNOWN" },
  ])("translates $type to '$expected'", ({ type, expected }) => {
    expect(getRateTypeLabel(type)).toBe(expected);
  });
});

describe("getStatusLabel", () => {
  it.each([
    { status: "ACTIVE", expected: "Activo" },
    { status: "INACTIVE", expected: "Inactivo" },
    { status: "PENDING", expected: "Pendiente" },
    { status: "COMPLETED", expected: "Completado" },
    { status: "SUSPENDED", expected: "Suspendido" },
    { status: "UNKNOWN", expected: "UNKNOWN" },
  ])("translates $status to '$expected'", ({ status, expected }) => {
    expect(getStatusLabel(status)).toBe(expected);
  });
});

describe("getPaymentStatusLabel", () => {
  it.each([
    { status: "PENDING", expected: "Pendiente de pago" },
    { status: "PAID", expected: "Pagado" },
    { status: "OVERDUE", expected: "Vencido" },
    { status: "PARTIAL", expected: "Pago parcial" },
    { status: "VOIDED", expected: "Cancelado" },
    { status: "UNKNOWN", expected: "UNKNOWN" },
  ])("translates $status to '$expected'", ({ status, expected }) => {
    expect(getPaymentStatusLabel(status)).toBe(expected);
  });
});
