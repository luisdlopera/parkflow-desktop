import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVehicleEntry } from "../useVehicleEntry";
import { createParkingEntry } from "@/features/vehicle-entry/services/vehicle-entry.service";
import { queueOfflineOperation } from "@/lib/offline-outbox";
import {
  printReceiptIfTauri,
  buildTicketPreviewForOperation,
} from "@/lib/tauri-print";
import { currentUser } from "@/features/auth/services/auth-domain.service";
import {
  newIdempotencyKey,
  getOrCreateIdempotencyKey,
  clearIdempotencyKey,
} from "@/lib/idempotency";
import { normalizeApiError } from "@/lib/errors/normalize-api-error";

vi.mock("@/features/vehicle-entry/services/vehicle-entry.service", () => ({
  createParkingEntry: vi.fn(),
}));

vi.mock("@/lib/offline-outbox", () => ({
  queueOfflineOperation: vi.fn(),
}));

vi.mock("@/lib/tauri-print", () => ({
  buildTicketPreviewForOperation: vi.fn(() => ["Preview line 1"]),
  printReceiptIfTauri: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/features/auth/services/auth-domain.service", () => ({
  currentUser: vi.fn(),
}));

vi.mock("@/lib/idempotency", () => ({
  newIdempotencyKey: vi.fn(() => crypto.randomUUID()),
  getOrCreateIdempotencyKey: vi.fn(() => crypto.randomUUID()),
  clearIdempotencyKey: vi.fn(),
}));

vi.mock("@/lib/validation/plate-validator", () => ({
  normalizePlate: vi.fn((p: string) => p?.trim()?.toUpperCase() ?? ""),
  inferVehicleType: vi.fn(() => "CAR"),
}));

vi.mock("@/lib/errors/normalize-api-error", () => ({
  normalizeApiError: vi.fn(),
}));

vi.mock("@/lib/errors/get-user-error-message", () => ({
  getUserErrorMessage: vi.fn(() => ({
    description: "Error del servidor",
    title: "Error",
  })),
}));

vi.mock("@/lib/validation/request-guard", () => ({
  toUserMessageFromClientValidation: vi.fn(() => null),
}));

function createMockForm() {
  const reset = vi.fn();
  const getValues = vi.fn().mockReturnValue("ABC123");
  return {
    reset,
    getValues,
    handleSubmit: vi.fn(),
    formState: { errors: {} },
    register: vi.fn(),
    setValue: vi.fn(),
    watch: vi.fn(),
    control: {},
  } as any;
}

const defaultSettings = {
  mode: "beginner" as const,
  defaultVehicleType: "CAR" as const,
  rememberLocation: true,
  skipConditionCheck: false,
  platePrefix: "",
};

const defaultOccupancy = { availableSpaces: 50, activeSpaces: 30 };

const mockFormValues = {
  plate: "ABC123",
  type: "CAR",
  countryCode: "CO",
  entryMode: "VISITOR",
  noPlate: false,
  noPlateReason: "",
  rateId: "rate-1",
  site: "Principal",
  lane: "L1",
  booth: "B1",
  terminal: "T1",
  observations: "Sin novedades",
  vehicleCondition: "",
  conditionChecklist: "",
  conditionPhotoUrls: "",
  custodiedItems: [],
};

const mockSuccessPayload = {
  sessionId: "sess-1",
  receipt: {
    ticketNumber: "T001",
    plate: "ABC123",
    vehicleType: "CAR",
    site: "Principal",
    lane: "L1",
    booth: "B1",
    terminal: "T1",
    parkingSpaceCode: "A1",
    entryAt: "2025-06-01T10:00:00Z",
  },
};

const mockUser = { id: "user-1", name: "Operator", email: "op@test.com" };

describe("useVehicleEntry", () => {
  let onSuccess: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;
  let onOfflineQueued: ReturnType<typeof vi.fn>;
  let onIncrementStats: ReturnType<typeof vi.fn>;
  let onReloadOccupancy: ReturnType<typeof vi.fn>;
  let clearAutoSave: ReturnType<typeof vi.fn>;
  let form: ReturnType<typeof createMockForm>;

  beforeEach(() => {
    vi.clearAllMocks();
    onSuccess = vi.fn();
    onError = vi.fn();
    onOfflineQueued = vi.fn();
    onIncrementStats = vi.fn();
    onReloadOccupancy = vi.fn();
    clearAutoSave = vi.fn();
    form = createMockForm();
    form.getValues.mockReturnValue("ABC123");

    vi.mocked(currentUser).mockResolvedValue(mockUser as any);
    vi.mocked(createParkingEntry).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve(mockSuccessPayload),
    } as Response);
  });

  it("creates entry and calls onSuccess with full payload", async () => {
    const { result } = renderHook(() =>
      useVehicleEntry({
        form,
        settings: defaultSettings,
        occupancy: defaultOccupancy,
        isMotorcycleOnly: false,
        onSuccess,
        onError,
        onOfflineQueued,
        onIncrementStats,
        onReloadOccupancy,
        clearAutoSave,
      }),
    );

    await act(async () => {
      await result.current.submit(mockFormValues as any);
    });

    expect(clearAutoSave).toHaveBeenCalledOnce();
    expect(createParkingEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        operatorUserId: mockUser.id,
        plate: "ABC123",
        type: "CAR",
        site: "Principal",
        lane: "L1",
        booth: "B1",
        terminal: "T1",
      }),
    );
    expect(buildTicketPreviewForOperation).toHaveBeenCalled();
    expect(printReceiptIfTauri).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith({
      ticketNumber: "T001",
      plate: "ABC123",
      previewLines: ["Preview line 1"],
      printWarning: null,
      spaceCode: "A1",
    });
    expect(onIncrementStats).toHaveBeenCalledOnce();
    expect(onReloadOccupancy).toHaveBeenCalledOnce();
    expect(form.reset).toHaveBeenCalledOnce();
  });

  it("rejects entry when no spaces available", async () => {
    const { result } = renderHook(() =>
      useVehicleEntry({
        form,
        settings: defaultSettings,
        occupancy: { availableSpaces: 0, activeSpaces: 50 },
        isMotorcycleOnly: false,
        onSuccess,
        onError,
        onOfflineQueued,
        onIncrementStats,
        onReloadOccupancy,
        clearAutoSave,
      }),
    );

    await act(async () => {
      await result.current.submit(mockFormValues as any);
    });

    expect(onError).toHaveBeenCalledWith(
      "No hay celdas disponibles para este negocio.",
    );
    expect(createParkingEntry).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("queues operation offline when network error occurs", async () => {
    vi.mocked(createParkingEntry).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    vi.mocked(queueOfflineOperation).mockResolvedValue(true);

    const { result } = renderHook(() =>
      useVehicleEntry({
        form,
        settings: defaultSettings,
        occupancy: defaultOccupancy,
        isMotorcycleOnly: false,
        onSuccess,
        onError,
        onOfflineQueued,
        onIncrementStats,
        onReloadOccupancy,
        clearAutoSave,
      }),
    );

    await act(async () => {
      await result.current.submit(mockFormValues as any);
    });

    expect(queueOfflineOperation).toHaveBeenCalledWith(
      "ENTRY_RECORDED",
      expect.objectContaining({
        plate: "ABC123",
        origin: "OFFLINE_PENDING_SYNC",
      }),
    );
    expect(clearIdempotencyKey).toHaveBeenCalled();
    expect(onOfflineQueued).toHaveBeenCalledOnce();
    expect(onIncrementStats).toHaveBeenCalledOnce();
    expect(form.reset).toHaveBeenCalledOnce();
  });

  it("shows error message when offline queue fails", async () => {
    vi.mocked(createParkingEntry).mockRejectedValue(
      new TypeError("Failed to fetch"),
    );
    vi.mocked(queueOfflineOperation).mockResolvedValue(false);

    const { result } = renderHook(() =>
      useVehicleEntry({
        form,
        settings: defaultSettings,
        occupancy: defaultOccupancy,
        isMotorcycleOnly: false,
        onSuccess,
        onError,
        onOfflineQueued,
        onIncrementStats,
        onReloadOccupancy,
        clearAutoSave,
      }),
    );

    await act(async () => {
      await result.current.submit(mockFormValues as any);
    });

    expect(onError).toHaveBeenCalledWith(
      "Sin conexión: no se pudo guardar localmente. Verifique la configuración offline.",
    );
    expect(onOfflineQueued).not.toHaveBeenCalled();
  });

  it("handles 409 conflict for already active vehicle", async () => {
    vi.mocked(createParkingEntry).mockResolvedValue({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() =>
      useVehicleEntry({
        form,
        settings: defaultSettings,
        occupancy: defaultOccupancy,
        isMotorcycleOnly: false,
        onSuccess,
        onError,
        onOfflineQueued,
        onIncrementStats,
        onReloadOccupancy,
        clearAutoSave,
      }),
    );

    await act(async () => {
      await result.current.submit(mockFormValues as any);
    });

    expect(onError).toHaveBeenCalledWith(
      "Este vehículo ya tiene una entrada activa.",
    );
  });

  it("handles server validation errors with extracted message", async () => {
    vi.mocked(createParkingEntry).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: () =>
        Promise.resolve({
          code: "VALIDATION_ERROR",
          details: [{ message: "Placa inválida" }],
        }),
    } as Response);
    vi.mocked(normalizeApiError).mockResolvedValue({
      code: "VALIDATION_ERROR",
      details: [{ message: "Placa inválida" }],
    } as any);

    const { result } = renderHook(() =>
      useVehicleEntry({
        form,
        settings: defaultSettings,
        occupancy: defaultOccupancy,
        isMotorcycleOnly: false,
        onSuccess,
        onError,
        onOfflineQueued,
        onIncrementStats,
        onReloadOccupancy,
        clearAutoSave,
      }),
    );

    await act(async () => {
      await result.current.submit(mockFormValues as any);
    });

    expect(onError).toHaveBeenCalledWith("Placa inválida");
  });

  it("requires authenticated user session", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useVehicleEntry({
        form,
        settings: defaultSettings,
        occupancy: defaultOccupancy,
        isMotorcycleOnly: false,
        onSuccess,
        onError,
        onOfflineQueued,
        onIncrementStats,
        onReloadOccupancy,
        clearAutoSave,
      }),
    );

    await act(async () => {
      await result.current.submit(mockFormValues as any);
    });

    expect(onError).toHaveBeenCalledWith(
      "Sesion requerida para registrar ingresos",
    );
  });

  it("rotates idempotency key after successful submission", async () => {
    const keys: string[] = [];
    vi.mocked(getOrCreateIdempotencyKey).mockImplementation(() => {
      const k = crypto.randomUUID();
      keys.push(k);
      return k;
    });

    const { result } = renderHook(() =>
      useVehicleEntry({
        form,
        settings: defaultSettings,
        occupancy: defaultOccupancy,
        isMotorcycleOnly: false,
        onSuccess,
        onError,
        onOfflineQueued,
        onIncrementStats,
        onReloadOccupancy,
        clearAutoSave,
      }),
    );

    const keyBefore = result.current.idempotencyKeyRef.current;

    await act(async () => {
      await result.current.submit(mockFormValues as any);
    });

    expect(result.current.idempotencyKeyRef.current).not.toBe(keyBefore);
  });

  it("generates NP- plate for no-plate entries", async () => {
    const noPlateValues = { ...mockFormValues, noPlate: true, plate: "" };

    const { result } = renderHook(() =>
      useVehicleEntry({
        form,
        settings: defaultSettings,
        occupancy: defaultOccupancy,
        isMotorcycleOnly: false,
        onSuccess,
        onError,
        onOfflineQueued,
        onIncrementStats,
        onReloadOccupancy,
        clearAutoSave,
      }),
    );

    await act(async () => {
      await result.current.submit(noPlateValues as any);
    });

    const callArgs = vi.mocked(createParkingEntry).mock.calls[0][0];
    expect(callArgs.plate).toMatch(/^NP-/);
  });

  it("handles print errors gracefully", async () => {
    vi.mocked(printReceiptIfTauri).mockRejectedValue(
      new Error("Impresora no disponible"),
    );

    const { result } = renderHook(() =>
      useVehicleEntry({
        form,
        settings: defaultSettings,
        occupancy: defaultOccupancy,
        isMotorcycleOnly: false,
        onSuccess,
        onError,
        onOfflineQueued,
        onIncrementStats,
        onReloadOccupancy,
        clearAutoSave,
      }),
    );

    await act(async () => {
      await result.current.submit(mockFormValues as any);
    });

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        printWarning: "No se pudo imprimir: Impresora no disponible",
      }),
    );
  });
});
