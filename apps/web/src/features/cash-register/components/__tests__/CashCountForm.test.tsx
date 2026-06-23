import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import ArqueoForm from "../ArqueoForm";

vi.mock("@/components/bridge/Input", async () => {
  const React = await import("react");
  return {
    Input: React.forwardRef(function MockInput({ label, type, value, onChange, ...props }: any, ref: any) {
      return (
        <div>
          <label>{label}</label>
          <input
            ref={ref}
            type={type || "text"}
            data-testid={`input-${label}`}
            value={value ?? ""}
            onChange={(e) => onChange && onChange(e)}
            {...props}
          />
        </div>
      );
    }),
  };
});

vi.mock("@/components/bridge/TextArea", async () => {
  const React = await import("react");
  return {
    TextArea: React.forwardRef(function MockTextArea({ label, value, onChange, isInvalid, errorMessage, ...props }: any, ref: any) {
      return (
        <div>
          <label>{label}</label>
          <textarea
            ref={ref}
            data-testid={`textarea-${label}`}
            value={value ?? ""}
            onChange={(e) => onChange && onChange(e as any)}
            {...props}
          />
        </div>
      );
    }),
  };
});

vi.mock("@/components/bridge/Button", () => ({
  Button: ({ children, onPress, isDisabled, isLoading }: any) => (
    <button onClick={onPress} disabled={isDisabled || isLoading} data-testid="count-button">
      {isLoading ? "Guardando..." : children}
    </button>
  ),
}));

function FormWrapper({ p }: { p: any }) {
  const countForm = useForm({
    defaultValues: {
      countCash: p.countCash ?? "0",
      countCard: p.countCard ?? "0",
      countTransfer: p.countTransfer ?? "0",
      countOther: p.countOther ?? "0",
      countNotes: p.countNotes ?? "",
    },
  });

  const mergedP = {
    ...p,
    countForm,
    countCash: p.countCash ?? "0",
    countCard: p.countCard ?? "0",
    countTransfer: p.countTransfer ?? "0",
    countOther: p.countOther ?? "0",
    countNotes: p.countNotes ?? "",
  };

  return (
    <FormProvider {...countForm}>
      <ArqueoForm p={mergedP} />
    </FormProvider>
  );
}

describe("CashCountForm (ArqueoForm)", () => {
  const onCount = vi.fn();
  const onPrintCount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders denomination inputs", () => {
    render(
      <FormWrapper
        p={{
          session: { countedAt: null },
          summary: null,
          busy: false,
          onCount,
          onPrintCount,
        }}
      />,
    );

    expect(screen.getByText("Efectivo contado")).toBeInTheDocument();
    expect(screen.getByText("Tarjetas")).toBeInTheDocument();
    expect(screen.getByText("Transferencias")).toBeInTheDocument();
    expect(screen.getByText("Otros")).toBeInTheDocument();
  });

  it("calculates total from denomination inputs", () => {
    render(
      <FormWrapper
        p={{
          session: { countedAt: null },
          summary: { expectedLedgerTotal: 30000 },
          countCash: "20000",
          countCard: "5000",
          countTransfer: "3000",
          countOther: "2000",
          busy: false,
          onCount,
          onPrintCount,
        }}
      />,
    );

    expect(screen.getByText(/Total contado:/).parentElement).toHaveTextContent("$30,000");
    expect(screen.getByText(/Esperado:/).parentElement).toHaveTextContent("$30,000");
  });

  it("shows difference when total does not match expected", () => {
    render(
      <FormWrapper
        p={{
          session: { countedAt: null },
          summary: { expectedLedgerTotal: 30000 },
          countCash: "25000",
          countCard: "0",
          countTransfer: "0",
          countOther: "0",
          busy: false,
          onCount,
          onPrintCount,
        }}
      />,
    );

    expect(screen.getByText(/Diferencia:/).parentElement).toHaveTextContent(/\$-5,000/);
  });

  it("submits form when Guardar arqueo is clicked", async () => {
    const user = userEvent.setup();
    const onCountHandler = vi.fn();

    const TestForm = () => {
      const countForm = useForm({
        defaultValues: { countCash: "10000", countCard: "0", countTransfer: "0", countOther: "0", countNotes: "" },
      });

      return (
        <FormProvider {...countForm}>
          <ArqueoForm
            p={{
              session: { countedAt: null },
              countForm,
              summary: null,
              busy: false,
              countCash: "10000",
              countCard: "0",
              countTransfer: "0",
              countOther: "0",
              countNotes: "",
              onCount: onCountHandler,
              onPrintCount: vi.fn(),
            }}
          />
        </FormProvider>
      );
    };

    render(<TestForm />);

    await user.click(screen.getByText("Guardar arqueo"));
    expect(onCountHandler).toHaveBeenCalled();
  });

  it("disables print button when session has no countedAt", () => {
    render(
      <FormWrapper
        p={{
          session: { countedAt: null },
          summary: null,
          busy: false,
          onCount,
          onPrintCount,
        }}
      />,
    );

    const printBtn = screen.getByText("Imprimir comprobante de arqueo");
    expect(printBtn).toBeDisabled();
  });
});
