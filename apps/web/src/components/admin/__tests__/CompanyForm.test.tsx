import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanyForm } from "../CompanyForm";
import type { CreateCompanyRequest, Company } from "@/lib/licensing/types";

const mockSubmit = vi.fn<(data: CreateCompanyRequest) => Promise<void>>();
const mockToastDanger = vi.fn();

vi.mock("@heroui/react", async () => {
  return {
    toast: {
      danger: (...args: any[]) => mockToastDanger(...args),
    },
    ListBox: ({ children }: any) => <div data-testid="listbox">{children}</div>,
    Separator: () => <hr data-testid="separator" />,
  };
});

vi.mock("@/components/ui/Select", async () => {
  const React = await import("react");
  return {
    Select: ({ children, value, onChange, label }: any) => {
      // Renderiza un select nativo para poder interactuar con userEvent
      // Extrae opciones de los children (ListBox -> ListBox.Item)
      const options: Array<{ id: string; textValue: string }> = [];
      const extractOptions = (children: any) => {
        if (!children) return;
        React.Children.forEach(children, (child: any) => {
          if (child?.props?.children) {
            extractOptions(child.props.children);
          }
          if (child?.props?.id) {
            options.push({ id: child.props.id, textValue: child.props.textValue || child.props.id });
          }
        });
      };
      extractOptions(children);
      return (
        <div data-testid={`select-wrapper-${label}`}>
          <label>{label}</label>
          <select
            data-testid={`select-${label}`}
            value={Array.isArray(value) ? value[0] : value}
            onChange={(e) => {
              const val = e.target.value;
              if (onChange) onChange(new Set([val]));
            }}
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.textValue}
              </option>
            ))}
          </select>
        </div>
      );
    },
    SelectBase: () => null,
  };
});

vi.mock("@/components/ui/Input", async () => {
  const React = await import("react");
  return {
    Input: React.forwardRef(function MockInput({ label, type, isInvalid, ...props }: any, ref: any) {
      return (
        <div>
          <label>{label}</label>
          <input ref={ref} type={type || "text"} data-testid={props["data-testid"] || props.name} {...props} />
        </div>
      );
    }),
  };
});

vi.mock("@/components/ui/TextArea", async () => {
  const React = await import("react");
  return {
    TextArea: React.forwardRef(function MockTextArea({ label, isInvalid, ...props }: any, ref: any) {
      return (
        <div>
          <label>{label}</label>
          <textarea ref={ref} data-testid={props["data-testid"] || props.name} {...props} />
        </div>
      );
    }),
  };
});

vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, type, isLoading, ...props }: any) => (
    <button type={type} data-testid="submit-button" disabled={isLoading} {...props}>
      {isLoading ? "Guardando..." : children}
    </button>
  ),
}));

vi.mock("@/components/feedback/InlineFieldError", () => ({
  InlineFieldError: ({ message }: any) =>
    message ? <span data-testid="inline-error">{message}</span> : null,
}));

vi.mock("@/components/feedback/FormErrorSummary", () => ({
  FormErrorSummary: ({ message }: any) =>
    message ? <div data-testid="form-error-summary">{message}</div> : null,
}));

vi.mock("@/lib/errors/get-user-error-message", () => ({
  getUserErrorMessage: (error: any, context: string) => {
    if (error?.message) {
      return { title: "Error", description: error.message, severity: "error" };
    }
    return { title: "Error", description: "Error desconocido", severity: "error" };
  },
}));

vi.mock("@/lib/licensing/hooks", () => ({
  getPlanFeatures: (plan: string) => {
    const features: Record<string, string[]> = {
      LOCAL: ["Offline", "Tickets"],
      SYNC: ["Cloud", "Sync"],
      PRO: ["Multi-sede", "Auditoría"],
      ENTERPRISE: ["SLA", "API"],
    };
    return features[plan] || features.LOCAL;
  },
}));

describe("CompanyForm", () => {
  beforeEach(() => {
    mockSubmit.mockClear();
    mockToastDanger.mockClear();
  });

  it("renders all fields with default values for creation", () => {
    render(<CompanyForm onSubmit={mockSubmit} isLoading={false} />);

    expect(screen.getByText("Nombre de la empresa *")).toBeInTheDocument();
    expect(screen.getByText("NIT (Opcional)")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Teléfono")).toBeInTheDocument();
    expect(screen.getByText("Ciudad")).toBeInTheDocument();
    expect(screen.getByText("Nombre de contacto")).toBeInTheDocument();
    expect(screen.getByText("Dirección")).toBeInTheDocument();
    expect(screen.getByText("Plan *")).toBeInTheDocument();
    expect(screen.getByText("Máx. dispositivos")).toBeInTheDocument();
    expect(screen.getByText("Máx. sedes")).toBeInTheDocument();
    expect(screen.getByText("Máx. usuarios")).toBeInTheDocument();
    expect(screen.getByText("Días de prueba")).toBeInTheDocument();
    expect(screen.getByText("Modo offline permitido")).toBeInTheDocument();
    expect(screen.getByTestId("submit-button")).toHaveTextContent("Crear Empresa");
  });

  it("submits with valid data when all required fields are filled", async () => {
    const user = userEvent.setup();
    render(<CompanyForm onSubmit={mockSubmit} isLoading={false} />);

    // Nombre de la empresa
    const nameInput = screen.getByTestId("name");
    await user.type(nameInput, "Parqueadero Test");

    // Submit
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    const submitted = mockSubmit.mock.calls[0][0];
    expect(submitted.name).toBe("Parqueadero Test");
    expect(submitted.plan).toBe("LOCAL");
    expect(submitted.maxDevices).toBe(1);
    expect(submitted.maxLocations).toBe(1);
    expect(submitted.maxUsers).toBe(5);
    expect(submitted.trialDays).toBe(14);
    expect(submitted.offlineModeAllowed).toBe(true);
  });

  it("shows validation error when name is empty", async () => {
    const user = userEvent.setup();
    render(<CompanyForm onSubmit={mockSubmit} isLoading={false} />);

    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("inline-error")).toHaveTextContent("Ingresa el nombre de la empresa.");
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("prefills fields with initialData when editing", () => {
    const initialData: Company = {
      id: "c1",
      name: "Empresa Alpha",
      nit: "123",
      email: "a@b.com",
      phone: "300",
      city: "Bogotá",
      contactName: "Juan",
      address: "Calle 1",
      plan: "PRO",
      status: "ACTIVE",
      maxDevices: 10,
      maxLocations: 5,
      maxUsers: 20,
      trialDays: 30,
      offlineModeAllowed: false,
      offlineLeaseHours: 48,
      modules: [],
      devices: [],
      createdAt: "2026-01-01T00:00:00Z",
    };

    render(<CompanyForm onSubmit={mockSubmit} isLoading={false} initialData={initialData} />);

    expect(screen.getByTestId("submit-button")).toHaveTextContent("Actualizar Empresa");
    // Verificamos que los valores iniciales se renderizan en los inputs
    expect(screen.getByDisplayValue("Empresa Alpha")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123")).toBeInTheDocument();
    expect(screen.getByDisplayValue("a@b.com")).toBeInTheDocument();
    // Verificamos el valor del select de Plan
    expect(screen.getByTestId("select-Plan *")).toHaveValue("PRO");
  });

  it("displays and toast error when onSubmit throws", async () => {
    const user = userEvent.setup();
    mockSubmit.mockRejectedValueOnce(new Error("Error de servidor"));

    render(<CompanyForm onSubmit={mockSubmit} isLoading={false} />);

    await user.type(screen.getByTestId("name"), "Test");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("form-error-summary")).toHaveTextContent("Error de servidor");
    });
    expect(mockToastDanger).toHaveBeenCalledWith("Error: Error de servidor");
  });

  it("does not call onSubmit when isLoading is true", async () => {
    const user = userEvent.setup();
    render(<CompanyForm onSubmit={mockSubmit} isLoading={true} />);

    expect(screen.getByTestId("submit-button")).toBeDisabled();
    expect(screen.getByTestId("submit-button")).toHaveTextContent("Guardando...");
  });

  it("allows optional fields to be empty", async () => {
    const user = userEvent.setup();
    render(<CompanyForm onSubmit={mockSubmit} isLoading={false} />);

    await user.type(screen.getByTestId("name"), "Solo Nombre");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    const submitted = mockSubmit.mock.calls[0][0];
    expect(submitted.email).toBe("");
    expect(submitted.phone).toBe("");
    expect(submitted.city).toBe("");
    expect(submitted.contactName).toBe("");
    expect(submitted.address).toBe("");
  });
});
