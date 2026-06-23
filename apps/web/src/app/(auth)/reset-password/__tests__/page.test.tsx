import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResetPasswordPage from "../page";

const mockUseSearchParams = vi.hoisted(() => vi.fn().mockReturnValue({
  get: vi.fn().mockReturnValue(null),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: mockUseSearchParams,
}));

const mockConfirmPasswordReset = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/auth-api", () => ({
  confirmPasswordReset: mockConfirmPasswordReset,
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders token field", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByLabelText(/código de recuperación/i)).toBeInTheDocument();
  });

  it("renders password fields", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByLabelText("Nueva contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar contraseña")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText("Restablecer contraseña")).toBeInTheDocument();
  });

  it("pre-fills token from URL search params", () => {
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => (key === "token" ? "reset-token-123" : null)),
    });
    render(<ResetPasswordPage />);
    const tokenInput = screen.getByLabelText(/código de recuperación/i) as HTMLInputElement;
    expect(tokenInput.value).toBe("reset-token-123");
  });

  it("shows error when passwords do not match", async () => {
    render(<ResetPasswordPage />);
    const tokenInput = screen.getByLabelText(/código de recuperación/i);
    const passwordInput = screen.getByLabelText("Nueva contraseña");
    const confirmInput = screen.getByLabelText("Confirmar contraseña");
    const submitButton = screen.getByText("Restablecer contraseña");

    fireEvent.change(tokenInput, { target: { value: "token-123" } });
    fireEvent.change(passwordInput, { target: { value: "StrongPass1!" } });
    fireEvent.change(confirmInput, { target: { value: "DifferentPass1!" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Las contraseñas no coinciden")).toBeInTheDocument();
    });
  });

  it("calls confirmPasswordReset on valid submission", async () => {
    mockConfirmPasswordReset.mockResolvedValueOnce(undefined);
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => (key === "token" ? "valid-token" : null)),
    });

    render(<ResetPasswordPage />);
    const passwordInput = screen.getByLabelText("Nueva contraseña");
    const confirmInput = screen.getByLabelText("Confirmar contraseña");
    const submitButton = screen.getByText("Restablecer contraseña");

    fireEvent.change(passwordInput, { target: { value: "StrongP@ss1" } });
    fireEvent.change(confirmInput, { target: { value: "StrongP@ss1" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockConfirmPasswordReset).toHaveBeenCalledWith("valid-token", "StrongP@ss1");
    });
  });

  it("shows success message after successful reset", async () => {
    mockConfirmPasswordReset.mockResolvedValueOnce(undefined);
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => (key === "token" ? "valid-token" : null)),
    });

    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "StrongP@ss1" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "StrongP@ss1" } });
    fireEvent.click(screen.getByText("Restablecer contraseña"));

    await waitFor(() => {
      expect(screen.getByText("Contraseña restablecida")).toBeInTheDocument();
      expect(screen.getByText("Iniciar sesión")).toBeInTheDocument();
    });
  });

  it("shows error when API call fails", async () => {
    mockConfirmPasswordReset.mockRejectedValueOnce(
      new Error("Token inválido o expirado")
    );
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => (key === "token" ? "expired-token" : null)),
    });

    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText("Nueva contraseña"), { target: { value: "StrongP@ss1" } });
    fireEvent.change(screen.getByLabelText("Confirmar contraseña"), { target: { value: "StrongP@ss1" } });
    fireEvent.click(screen.getByText("Restablecer contraseña"));

    await waitFor(() => {
      expect(screen.getByText("Token inválido o expirado")).toBeInTheDocument();
    });
  });

  it("disables submit button when token is empty", () => {
    render(<ResetPasswordPage />);
    const submitButton = screen.getByText("Restablecer contraseña");
    expect(submitButton).toBeDisabled();
  });
});
