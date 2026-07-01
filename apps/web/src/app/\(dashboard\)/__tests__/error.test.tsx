import { render, screen, fireEvent } from "@testing-library/react";
import DashboardError from "@/app/(dashboard)/error";

describe("DashboardError", () => {
  const mockReset = jest.fn();
  const mockError = new Error("Test dashboard error");
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

  afterEach(() => {
    jest.clearAllMocks();
    mockReset.mockClear();
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders error UI with icon, heading, and message", () => {
    render(<DashboardError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Ocurrió un error inesperado")).toBeInTheDocument();
    expect(screen.getByText("Test dashboard error")).toBeInTheDocument();
  });

  it("shows custom error message when provided", () => {
    const customError = new Error("Custom error message");
    render(<DashboardError error={customError} reset={mockReset} />);

    expect(screen.getByText("Custom error message")).toBeInTheDocument();
  });

  it("shows default message when error.message is empty", () => {
    const errorNoMessage = new Error("");
    render(<DashboardError error={errorNoMessage} reset={mockReset} />);

    expect(screen.getByText("No se pudo cargar esta sección. Intenta de nuevo.")).toBeInTheDocument();
  });

  it("renders retry button", () => {
    render(<DashboardError error={mockError} reset={mockReset} />);

    const retryButton = screen.getByRole("button", { name: /Reintentar/i });
    expect(retryButton).toBeInTheDocument();
  });

  it("calls reset() when retry button is clicked", () => {
    render(<DashboardError error={mockError} reset={mockReset} />);

    const retryButton = screen.getByRole("button", { name: /Reintentar/i });
    fireEvent.click(retryButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("logs error to console on mount", () => {
    render(<DashboardError error={mockError} reset={mockReset} />);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[DashboardError]", mockError);
  });

  it("handles undefined error gracefully", () => {
    const undefinedError = new Error();
    render(<DashboardError error={undefinedError} reset={mockReset} />);

    expect(screen.getByText("No se pudo cargar esta sección. Intenta de nuevo.")).toBeInTheDocument();
  });

  it("handles error digest prop", () => {
    const errorWithDigest = {
      ...mockError,
      digest: "test-digest-456",
    };
    render(<DashboardError error={errorWithDigest as Error & { digest: string }} reset={mockReset} />);

    expect(screen.getByText("Test dashboard error")).toBeInTheDocument();
  });
});
