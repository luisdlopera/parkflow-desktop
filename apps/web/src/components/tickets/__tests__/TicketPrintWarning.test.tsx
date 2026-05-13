import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketPrintWarning from "../TicketPrintWarning";

const MOCK_PROPS = {
  ticketNumber: "T-20260513-000001",
  plate: "ABC123",
  previewLines: [
    "Parkflow",
    "Ticket: T-20260513-000001",
    "Placa: ABC123",
    "Ingreso: 2026-05-13 10:00",
  ],
  onDownload: vi.fn(),
  onReprint: vi.fn(),
  onClose: vi.fn(),
};

describe("TicketPrintWarning", () => {
  it("shows success header and print warning", () => {
    render(<TicketPrintWarning {...MOCK_PROPS} />);

    expect(screen.getByText(/Ingreso registrado correctamente/i)).toBeInTheDocument();
    expect(screen.getByText(/No se pudo imprimir el ticket/i)).toBeInTheDocument();
  });

  it("displays ticket number and plate in info section", () => {
    render(<TicketPrintWarning {...MOCK_PROPS} />);

    expect(screen.getAllByText(/T-20260513-000001/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ABC123/).length).toBeGreaterThan(0);
  });

  it("shows preview content when lines are provided", () => {
    render(<TicketPrintWarning {...MOCK_PROPS} />);

    expect(screen.getByText(/Placa: ABC123/)).toBeInTheDocument();
  });

  it("calls onDownload when download button is clicked", async () => {
    const onDownload = vi.fn();
    render(<TicketPrintWarning {...MOCK_PROPS} onDownload={onDownload} />);

    await userEvent.click(screen.getByRole("button", { name: /descargar ticket/i }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("calls onReprint when reprint button is clicked", async () => {
    const onReprint = vi.fn();
    render(<TicketPrintWarning {...MOCK_PROPS} onReprint={onReprint} />);

    await userEvent.click(screen.getByRole("button", { name: /reimprimir/i }));
    expect(onReprint).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    render(<TicketPrintWarning {...MOCK_PROPS} onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: /cerrar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows loading state on reprint button when reprintLoading is true", () => {
    render(<TicketPrintWarning {...MOCK_PROPS} reprintLoading={true} />);

    const reprintBtn = screen.getByRole("button", { name: /reimprimir/i });
    expect(reprintBtn).toHaveAttribute("data-loading", "true");
  });

  it("renders without preview when lines array is empty", () => {
    render(<TicketPrintWarning {...MOCK_PROPS} previewLines={[]} />);

    expect(screen.getByText(/Ingreso registrado correctamente/i)).toBeInTheDocument();
    expect(screen.getByText(/No se pudo imprimir el ticket/i)).toBeInTheDocument();
  });
});
