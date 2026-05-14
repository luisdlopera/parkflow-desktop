import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/mocks/server";
import { ToastProvider } from "@/lib/toast/ToastContext";
import VehicleEntryFormV2 from "@/components/forms/VehicleEntryFormV2";

function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";
const MOCK_SESSION = {
  accessToken: "mock-token",
  refreshToken: "mock-refresh",
  user: {
    id: MOCK_USER_ID,
    name: "Test Operator",
    email: "operator@test.com",
    role: "OPERADOR",
    permissions: ["tickets:emitir"],
  },
  session: {
    deviceId: "test-device",
    accessTokenExpiresAtIso: new Date(Date.now() + 86400000).toISOString(),
  },
  offlineLease: null,
};

function setupLocalStorage() {
  localStorage.setItem("parkflow.auth.session", JSON.stringify(MOCK_SESSION));
}

function clearLocalStorage() {
  localStorage.clear();
}

describe("VehicleEntryFormV2", () => {
  beforeEach(() => {
    setupLocalStorage();
    server.use(
      http.get("*/api/v1/configuration/vehicle-types", () => {
        return HttpResponse.json([
          { id: "1", code: "CAR", name: "Carro", isActive: true },
          { id: "2", code: "MOTORCYCLE", name: "Moto", isActive: true }
        ]);
      })
    );
  });

  afterEach(() => {
    clearLocalStorage();
  });

  it("renders the form with plate field", async () => {
    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });
  });

  it("does not submit when plate is empty", async () => {
    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("register-entry")).toBeInTheDocument();
    });

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText("Ingreso registrado")).not.toBeInTheDocument();
    });
  });

  it("normalizes plate to uppercase and removes spaces", async () => {
    let capturedBody: unknown = null;
    let typesFetched = false;
    server.use(
      http.get("*/api/v1/configuration/vehicle-types", () => {
        typesFetched = true;
        return HttpResponse.json([
          { id: "1", code: "CAR", name: "Carro", isActive: true },
          { id: "2", code: "MOTORCYCLE", name: "Moto", isActive: true }
        ]);
      }),
      http.post("*/api/v1/operations/entries", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          sessionId: "session-1",
          receipt: {
            ticketNumber: "T-20260513-000001",
            plate: "ABC123",
            vehicleType: "CAR",
            site: "Test Site",
            entryAt: "2026-05-13T10:00:00Z",
          },
          message: "Ingreso registrado",
        });
      })
    );

    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });

    const plateInput = screen.getByTestId("plate");
    await userEvent.type(plateInput, "abc 123");

    await screen.findByTestId("vehicle-type");

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
    }, { timeout: 3000 });

    expect(capturedBody).not.toBeNull();
    if (capturedBody) {
      const body = capturedBody as Record<string, unknown>;
      expect(body.plate).toBe("ABC123");
    }
  });

  it("sends idempotencyKey in the request", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post("*/api/v1/operations/entries", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          sessionId: "session-1",
          receipt: {
            ticketNumber: "T-20260513-000001",
            plate: "XYZ789",
            vehicleType: "CAR",
            site: "Test Site",
            entryAt: "2026-05-13T10:00:00Z",
          },
          message: "Ingreso registrado",
        });
      })
    );

    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });

    const plateInput = screen.getByTestId("plate");
    await userEvent.type(plateInput, "XYZ789");

    await screen.findByTestId("vehicle-type"); // Wait for types to load

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ingreso registrado/i)).toBeInTheDocument();
    });

    expect(capturedBody).not.toBeNull();
    if (capturedBody) {
      const body = capturedBody as Record<string, unknown>;
      expect(body.idempotencyKey).toBeDefined();
      expect(typeof body.idempotencyKey).toBe("string");
      expect((body.idempotencyKey as string).length).toBeGreaterThan(0);
    }
  });

  it("allows special entry without plate when a reason is provided", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post("*/api/v1/operations/entries", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          sessionId: "session-no-plate",
          receipt: {
            ticketNumber: "T-20260513-000077",
            plate: "SIN-123456789ABC",
            vehicleType: "CAR",
            site: "Test Site",
            entryAt: "2026-05-13T10:00:00Z",
          },
          message: "Ingreso registrado",
        });
      })
    );

    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByLabelText(/Sin placa/i));
    await userEvent.type(screen.getByLabelText(/Justificación sin placa/i), "Vehiculo oficial sin placa visible");

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
    });

    const body = capturedBody as Record<string, unknown>;
    expect(body.noPlate).toBe(true);
    expect(body.plate).toBeNull();
    expect(body.noPlateReason).toBe("Vehiculo oficial sin placa visible");
  });

  it("sends the correct vehicle type", async () => {
    let capturedBody: unknown = null;
    server.use(
      http.post("*/api/v1/operations/entries", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          sessionId: "session-1",
          receipt: {
            ticketNumber: "T-20260513-000001",
            plate: "MOTO1",
            vehicleType: "MOTORCYCLE",
            site: "Test Site",
            entryAt: "2026-05-13T10:00:00Z",
          },
          message: "Ingreso registrado",
        });
      })
    );

    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });

    const plateInput = screen.getByTestId("plate");
    await userEvent.type(plateInput, "MOT111");

    await screen.findByTestId("vehicle-type"); // Wait for types to load

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ingreso registrado/i)).toBeInTheDocument();
    });

    expect(capturedBody).not.toBeNull();
    if (capturedBody) {
      const body = capturedBody as Record<string, unknown>;
      expect(body.type).toBe("CAR");
    }
  });

  it("shows error message for 400 response", async () => {
    server.use(
      http.post("*/api/v1/operations/entries", () => {
        return HttpResponse.json(
          {
            errorCode: "VALIDATION_ERROR",
            userMessage: "Placa invalida",
            developerMessage: "Plate must match ^[A-Z0-9-]+$",
          },
          { status: 400 }
        );
      })
    );

    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });

    const plateInput = screen.getByTestId("plate");
    await userEvent.type(plateInput, "TES001");

    await screen.findByTestId("vehicle-type"); // Wait for types to load

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/revisa los datos/i)).toBeInTheDocument();
    });
  });

  it("shows specific message for 409 conflict", async () => {
    server.use(
      http.post("*/api/v1/operations/entries", () => {
        return HttpResponse.json(
          {
            errorCode: "OPERATION_ERROR",
            userMessage: "El vehiculo ya tiene una sesion activa",
          },
          { status: 409 }
        );
      })
    );

    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });

    const plateInput = screen.getByTestId("plate");
    await userEvent.type(plateInput, "DUP001");

    await screen.findByTestId("vehicle-type"); // Wait for types to load

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/ya tiene una entrada activa/i)).toBeInTheDocument();
    });
  });

  it("clears form and shows ticket after successful entry", async () => {
    server.use(
      http.post("*/api/v1/operations/entries", () => {
        return HttpResponse.json({
          sessionId: "session-1",
          receipt: {
            ticketNumber: "T-20260513-000042",
            plate: "SUCCESS",
            vehicleType: "CAR",
            site: "Test Site",
            entryAt: "2026-05-13T10:00:00Z",
          },
          message: "Ingreso registrado",
        });
      })
    );

    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });

    const plateInput = screen.getByTestId("plate");
    await userEvent.type(plateInput, "SUC111");

    await screen.findByTestId("vehicle-type");

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ingreso registrado/i)).toBeInTheDocument();
    });

    const plateAfterSubmit = screen.getByTestId("plate") as HTMLInputElement;
    expect(plateAfterSubmit.value).toBe("");
  });

  it("reuses the same idempotencyKey across retry attempts", async () => {
    let attemptCount = 0;
    let firstKey: string | null = null;
    let secondKey: string | null = null;

    server.use(
      http.post("*/api/v1/operations/entries", async ({ request }) => {
        attemptCount++;
        const body = (await request.json()) as Record<string, unknown>;
        if (attemptCount === 1) {
          firstKey = body.idempotencyKey as string;
          return HttpResponse.json(
            { errorCode: "VALIDATION_ERROR", userMessage: "Datos invalidos" },
            { status: 400 }
          );
        }
        secondKey = body.idempotencyKey as string;
        return HttpResponse.json({
          sessionId: "session-retry",
          receipt: {
            ticketNumber: "T-20260513-000099",
            plate: "RETRY",
            vehicleType: "CAR",
            site: "Test Site",
            entryAt: "2026-05-13T10:00:00Z",
          },
          message: "Ingreso registrado",
        });
      })
    );

    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });

    const plateInput = screen.getByTestId("plate");
    await userEvent.type(plateInput, "RET111");

    await screen.findByTestId("vehicle-type");

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/revisa los datos/i)).toBeInTheDocument();
    });

    await userEvent.click(submitBtn);

    await waitFor(() => {
      const plateAfterRetry = screen.getByTestId("plate") as HTMLInputElement;
      expect(plateAfterRetry.value).toBe("");
    });

    expect(firstKey).not.toBeNull();
    expect(secondKey).not.toBeNull();
    expect(secondKey).toBe(firstKey);
  });

  it("shows print warning when print-agent is unavailable", async () => {
    server.use(
      http.post("*/api/v1/operations/entries", () => {
        return HttpResponse.json({
          sessionId: "session-print-fail",
          receipt: {
            ticketNumber: "T-20260513-000100",
            plate: "PRINTFAIL",
            vehicleType: "CAR",
            site: "Test Site",
            entryAt: "2026-05-13T10:00:00Z",
          },
          message: "Ingreso registrado",
        });
      })
    );

    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });

    const plateInput = screen.getByTestId("plate");
    await userEvent.type(plateInput, "PRI111");

    await screen.findByTestId("vehicle-type");

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/No se pudo imprimir el ticket/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Ingreso registrado correctamente/i)).toBeInTheDocument();
    expect(screen.getAllByText(/T-20260513-000100/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PRINTFAIL/).length).toBeGreaterThan(0);
  });

  it("shows download and reprint buttons in print warning", async () => {
    server.use(
      http.post("*/api/v1/operations/entries", () => {
        return HttpResponse.json({
          sessionId: "session-print-fail-2",
          receipt: {
            ticketNumber: "T-20260513-000101",
            plate: "FAIL2",
            vehicleType: "CAR",
            site: "Test Site",
            entryAt: "2026-05-13T10:00:00Z",
          },
          message: "Ingreso registrado",
        });
      })
    );

    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });

    const plateInput = screen.getByTestId("plate");
    await userEvent.type(plateInput, "FAI111");

    await screen.findByTestId("vehicle-type");

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Descargar ticket/i).length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/Reimprimir/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cerrar/i).length).toBeGreaterThan(0);
  });

  it("does NOT show success when backend returns error", async () => {
    server.use(
      http.post("*/api/v1/operations/entries", () => {
        return HttpResponse.json(
          { errorCode: "OPERATION_ERROR", userMessage: "No se pudo registrar el ingreso" },
          { status: 500 }
        );
      })
    );

    renderWithProviders(<VehicleEntryFormV2 />);

    await waitFor(() => {
      expect(screen.getByTestId("plate")).toBeInTheDocument();
    });

    const plateInput = screen.getByTestId("plate");
    await userEvent.type(plateInput, "ERR500");

    await screen.findByTestId("vehicle-type");

    const submitBtn = screen.getByTestId("register-entry");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/no se pudo registrar/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByText(/Ingreso registrado/i)).not.toBeInTheDocument();
  });
});
