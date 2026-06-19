import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useVehicleEntry } from "@/features/vehicle-entry/hooks/useVehicleEntry";
import { vehicleEntrySchema } from "@/modules/parking/vehicle.schema";
import type { VehicleEntryFormValues } from "@/modules/parking/vehicle.schema";
import type { OperatorSettings } from "@/features/vehicle-entry/hooks/useOperatorSettings";

// --- mocks ---

vi.mock("@/lib/auth", () => ({
  currentUser: vi.fn().mockResolvedValue({ id: "user-001", role: "OPERATOR" }),
}));

vi.mock("@/features/vehicle-entry/services/vehicle-entry.service", () => ({
  createParkingEntry: vi.fn().mockImplementation(() => { console.log("MOCK CALLED"); return new Promise(() => {}); }),
}));

vi.mock("@/lib/tauri-print", () => ({
  buildTicketPreviewForOperation: vi.fn().mockReturnValue(["Ticket: ABC123", "Ingreso: 2026-06-19"]),
  printReceiptIfTauri: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/offline-outbox", () => ({
  queueOfflineOperation: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/idempotency", () => ({
  newIdempotencyKey: vi.fn().mockReturnValue("idem-test-key"),
  getOrCreateIdempotencyKey: vi.fn().mockReturnValue("idem-test-key"),
  clearIdempotencyKey: vi.fn(),
}));

// --- helpers ---

import { createParkingEntry } from "@/features/vehicle-entry/services/vehicle-entry.service";
import { queueOfflineOperation } from "@/lib/offline-outbox";

const defaultSettings: OperatorSettings = {
  mode: "beginner",
  defaultVehicleType: "CAR",
  rememberLocation: true,
  skipConditionCheck: false,
  platePrefix: "",
};

const validValues: VehicleEntryFormValues = {
  plate: "ABC123",
  type: "CAR",
  countryCode: "CO",
  entryMode: "VISITOR",
  noPlate: false,
  noPlateReason: "",
  rateId: "",
  site: "Principal",
  lane: "",
  booth: "",
  terminal: "",
  observations: "",
  vehicleCondition: "Sin novedades al ingreso",
  conditionChecklist: "",
  conditionPhotoUrls: "",
  custodiedItems: [],
};

function makeSuccessResponse(plate = "ABC123") {
  return new Response(
    JSON.stringify({
      sessionId: "session-001",
      receipt: {
        ticketNumber: "T-001",
        plate,
        vehicleType: "CAR",
        site: "Principal",
        lane: null,
        booth: null,
        terminal: null,
        parkingSpaceCode: "A-01",
        entryAt: "2026-06-19T10:00:00Z",
      },
    }),
    { status: 200 }
  );
}

function useVehicleEntryWithForm(
  occupancy: { availableSpaces: number; activeSpaces: number } | null = { availableSpaces: 10, activeSpaces: 5 },
  handlers: Partial<Parameters<typeof useVehicleEntry>[0]> = {}
) {
  const form = useForm<VehicleEntryFormValues>({
    resolver: zodResolver(vehicleEntrySchema),
    defaultValues: validValues,
  });

  const hook = useVehicleEntry({
    form,
    settings: defaultSettings,
    occupancy,
    isMotorcycleOnly: false,
    onSuccess: handlers.onSuccess || vi.fn(),
    onError: handlers.onError || vi.fn(),
    onOfflineQueued: handlers.onOfflineQueued || vi.fn(),
    onIncrementStats: handlers.onIncrementStats || vi.fn(),
    onReloadOccupancy: handlers.onReloadOccupancy || vi.fn(),
    clearAutoSave: handlers.clearAutoSave || vi.fn(),
    ...handlers,
  });

  return { ...hook, form };
}

// --- tests ---

describe("useVehicleEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks submit when no available spaces", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useVehicleEntryWithForm({ availableSpaces: 0, activeSpaces: 10 }, { onError }));

    await act(async () => {
      await result.current.submit(validValues);
    });

    expect(onError).toHaveBeenCalledWith("No hay celdas disponibles para este negocio.");
    expect(createParkingEntry).not.toHaveBeenCalled();
  });

  it("calls onSuccess with ticket data on successful entry", async () => {
    vi.mocked(createParkingEntry).mockResolvedValue(makeSuccessResponse());
    const onSuccess = vi.fn();
    const onIncrementStats = vi.fn();
    const onReloadOccupancy = vi.fn();
    const { result } = renderHook(() => useVehicleEntryWithForm(
      { availableSpaces: 10, activeSpaces: 5 },
      { onSuccess, onIncrementStats, onReloadOccupancy }
    ));

    await act(async () => {
      await result.current.submit(validValues);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketNumber: "T-001",
          plate: "ABC123",
        })
      );
    });

    expect(onIncrementStats).toHaveBeenCalled();
    expect(onReloadOccupancy).toHaveBeenCalled();
  });

  it("calls onError with 409 duplicate-vehicle message", async () => {
    vi.mocked(createParkingEntry).mockResolvedValue(
      new Response(JSON.stringify({ error: "DUPLICATE" }), { status: 409 })
    );
    const onError = vi.fn();
    const { result } = renderHook(() => useVehicleEntryWithForm(
      { availableSpaces: 10, activeSpaces: 5 },
      { onError }
    ));

    await act(async () => {
      await result.current.submit(validValues);
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Este vehículo ya tiene una entrada activa.");
    });
  });

  it("queues offline operation when network error occurs", async () => {
    vi.mocked(createParkingEntry).mockRejectedValue(new TypeError("Failed to fetch"));
    const onOfflineQueued = vi.fn();
    const { result } = renderHook(() => useVehicleEntryWithForm(
      { availableSpaces: 10, activeSpaces: 5 },
      { onOfflineQueued }
    ));

    await act(async () => {
      await result.current.submit(validValues);
    });

    await waitFor(() => {
      expect(queueOfflineOperation).toHaveBeenCalledWith("ENTRY_RECORDED", expect.objectContaining({ plate: "ABC123" }));
      expect(onOfflineQueued).toHaveBeenCalled();
    });
  });

  it("normalizes plate to uppercase before submission", async () => {
    vi.mocked(createParkingEntry).mockResolvedValue(makeSuccessResponse("ABC123"));
    const { result } = renderHook(() => useVehicleEntryWithForm());

    await act(async () => {
      await result.current.submit({ ...validValues, plate: "abc123" });
    });

    await waitFor(() => {
      expect(createParkingEntry).toHaveBeenCalledWith(
        expect.objectContaining({ plate: "ABC123" })
      );
    });
  });

  it("skips occupancy check when occupancy is null", async () => {
    vi.mocked(createParkingEntry).mockResolvedValue(makeSuccessResponse());
    const onError = vi.fn();
    const { result } = renderHook(() => useVehicleEntryWithForm(null, { onError }));

    await act(async () => {
      await result.current.submit(validValues);
    });

    expect(createParkingEntry).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("includes previewLines in onSuccess result", async () => {
    vi.mocked(createParkingEntry).mockResolvedValue(makeSuccessResponse());
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useVehicleEntryWithForm(
      { availableSpaces: 10, activeSpaces: 5 },
      { onSuccess }
    ));

    await act(async () => {
      await result.current.submit(validValues);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          previewLines: expect.arrayContaining(["Ticket: ABC123"]),
        })
      );
    });
  });
});
