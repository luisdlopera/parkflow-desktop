import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "../page";

const mockRequestPasswordReset = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/auth-api", () => ({
  requestPasswordReset: mockRequestPasswordReset,
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email input field", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("renders submit button with correct label", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("Enviar instrucciones")).toBeInTheDocument();
  });

  it("renders link back to login", () => {
    render(<ForgotPasswordPage />);
    const loginLink = screen.getByRole("link", { name: /iniciar sesión/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("calls requestPasswordReset on form submission", async () => {
    mockRequestPasswordReset.mockResolvedValueOnce(undefined);
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByText("Enviar instrucciones");

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith("user@example.com");
    });
  });

  it("shows success message after successful submission", async () => {
    mockRequestPasswordReset.mockResolvedValueOnce(undefined);
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByText("Enviar instrucciones");

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Solicitud enviada")).toBeInTheDocument();
      expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
    });
  });

  it("shows error message when request fails", async () => {
    mockRequestPasswordReset.mockRejectedValueOnce(
      new Error("El correo no está registrado")
    );
    render(<ForgotPasswordPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByText("Enviar instrucciones");

    fireEvent.change(emailInput, { target: { value: "unknown@test.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("El correo no está registrado")).toBeInTheDocument();
    });
  });

  it("shows loading state while submitting", async () => {
    let resolveReset: (value: unknown) => void;
    const resetPromise = new Promise((resolve) => { resolveReset = resolve; });
    mockRequestPasswordReset.mockReturnValueOnce(resetPromise);

    render(<ForgotPasswordPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByText("Enviar instrucciones");

    fireEvent.change(emailInput, { target: { value: "user@test.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Enviando...")).toBeInTheDocument();
    });

    resolveReset!(undefined);
  });

  it("shows return to login button after success", async () => {
    mockRequestPasswordReset.mockResolvedValueOnce(undefined);
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByText("Enviar instrucciones"));

    await waitFor(() => {
      expect(screen.getByText("Volver al inicio de sesión")).toBeInTheDocument();
    });
  });
});
