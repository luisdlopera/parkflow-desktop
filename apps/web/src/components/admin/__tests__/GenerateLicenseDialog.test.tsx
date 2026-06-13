import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerateLicenseDialog } from "../GenerateLicenseDialog";
import type { Company } from "@/lib/licensing/types";

const mockGenerateLicense = vi.fn<(request: any) => Promise<any>>();
const mockClearLicense = vi.fn();

vi.mock("@/lib/licensing/hooks", () => ({
  useGenerateLicense: () => ({
    generateLicense: (request: any) => mockGenerateLicense(request),
    license: null,
    isLoading: false,
    error: null,
    clearLicense: mockClearLicense,
  }),
  useDeviceFingerprint: () => ({
    fingerprint: "test-fingerprint-123",
  }),
}));

vi.mock("@/components/ui/Modal", () => {
  const ModalBase = ({ children, state }: any) => (
    <div data-testid="modal" data-open={state?.isOpen}>{children}</div>
  );
  const ModalHeader = ({ children }: any) => <div data-testid="modal-header">{children}</div>;
  const ModalBody = ({ children }: any) => <div data-testid="modal-body">{children}</div>;
  const ModalFooter = ({ children }: any) => <div data-testid="modal-footer">{children}</div>;
  const ModalContent = ({ children }: any) => <div data-testid="modal-content">{children}</div>;
  return {
    Modal: Object.assign(ModalBase, {
      Content: ModalContent,
      Header: ModalHeader,
      Body: ModalBody,
      Footer: ModalFooter,
    }),
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
  };
});

vi.mock("@/components/ui/Alert", () => ({
  Alert: ({ children, color }: any) => (
    <div data-testid="alert" data-color={color}>{children}</div>
  ),
}));

vi.mock("@/components/ui/Chip", () => ({
  Chip: ({ children }: any) => <span data-testid="chip">{children}</span>,
}));

vi.mock("@/components/ui/Card", () => {
  const CardBase = ({ children }: any) => <div data-testid="card">{children}</div>;
  return {
    Card: Object.assign(CardBase, {
      Content: ({ children }: any) => <div data-testid="card-content">{children}</div>,
    }),
  };
});

vi.mock("@/components/ui/Input", () => ({
  Input: ({ label, value, onChange, placeholder, startContent, description }: any) => (
    <div>
      <label>{label}</label>
      <input
        data-testid={label?.replace(/\s+/g, "-").toLowerCase() || "input"}
        value={value || ""}
        placeholder={placeholder}
        onChange={onChange}
      />
      {description && <span data-testid="input-description">{description}</span>}
      {startContent}
    </div>
  ),
}));

vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, onPress, isLoading, isDisabled, startContent, variant, ...props }: any) => (
    <button
      data-testid={props["data-testid"] || "button"}
      disabled={isLoading || isDisabled}
      onClick={onPress}
      {...props}
    >
      {isLoading && <span>Loading...</span>}
      {startContent}
      {children}
    </button>
  ),
}));

vi.mock("@heroui/react", () => ({
  Separator: () => <hr data-testid="separator" />,
}));

const mockCompany: Company = {
  id: "c1",
  name: "Empresa Test",
  plan: "PRO",
  status: "ACTIVE",
  maxDevices: 5,
  maxLocations: 2,
  maxUsers: 10,
  offlineModeAllowed: true,
  offlineLeaseHours: 48,
  modules: [],
  devices: [],
  createdAt: "2026-01-01T00:00:00Z",
};

describe("GenerateLicenseDialog", () => {
  beforeEach(() => {
    mockGenerateLicense.mockClear();
    mockClearLicense.mockClear();
  });

  it("renders company info and form when open", () => {
    render(
      <GenerateLicenseDialog
        isOpen={true}
        onClose={() => {}}
        company={mockCompany}
      />
    );

    expect(screen.getByText("Generar Licencia Offline")).toBeInTheDocument();
    expect(screen.getByText("Empresa Test")).toBeInTheDocument();
    expect(screen.getByText("PRO")).toBeInTheDocument();
    expect(screen.getByText("0 / 5")).toBeInTheDocument();
    expect(screen.getByTestId("device-fingerprint-*")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <GenerateLicenseDialog
        isOpen={false}
        onClose={() => {}}
        company={mockCompany}
      />
    );

    expect(screen.getByTestId("modal")).toHaveAttribute("data-open", "false");
  });

  it("fills device fingerprint and generates license", async () => {
    const user = userEvent.setup();
    mockGenerateLicense.mockResolvedValueOnce({
      deviceId: "d1",
      licenseKey: "KEY-123",
      signature: "SIG-456",
    });

    render(
      <GenerateLicenseDialog
        isOpen={true}
        onClose={() => {}}
        company={mockCompany}
      />
    );

    const fingerprintInput = screen.getByTestId("device-fingerprint-*");
    await user.type(fingerprintInput, "fp-test-123");

    const generateButton = screen.getByRole("button", { name: /Generar Licencia/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(mockGenerateLicense).toHaveBeenCalledTimes(1);
    });

    expect(mockGenerateLicense).toHaveBeenCalledWith({
      companyId: "c1",
      deviceFingerprint: "fp-test-123",
      hostname: "",
    });
  });

  it("disables generate button when fingerprint is empty", () => {
    render(
      <GenerateLicenseDialog
        isOpen={true}
        onClose={() => {}}
        company={mockCompany}
      />
    );

    const generateButton = screen.getByRole("button", { name: /Generar Licencia/i });
    expect(generateButton).toBeDisabled();
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <GenerateLicenseDialog
        isOpen={true}
        onClose={onClose}
        company={mockCompany}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /Cancelar/i });
    await user.click(cancelButton);

    expect(mockClearLicense).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
