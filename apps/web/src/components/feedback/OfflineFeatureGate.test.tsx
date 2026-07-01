import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import OfflineFeatureGate from "./OfflineFeatureGate";
import { isLocalFirstMode } from "@/lib/local-first/config";

// Mock next/navigation
const mockBack = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

// Mock local-first config
vi.mock("@/lib/local-first/config", () => ({
  isLocalFirstMode: vi.fn(),
}));

describe("OfflineFeatureGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(isLocalFirstMode).mockReturnValue(new Promise(() => {})); // Never resolves
    render(
      <OfflineFeatureGate>
        <div>Protected Content</div>
      </OfflineFeatureGate>
    );
    expect(screen.getByText("Verificando disponibilidad de la función...")).toBeInTheDocument();
  });

  it("renders children normally if not local first / offline mode", async () => {
    vi.mocked(isLocalFirstMode).mockResolvedValue(false);
    render(
      <OfflineFeatureGate>
        <div>Protected Content</div>
      </OfflineFeatureGate>
    );
    const content = await screen.findByText("Protected Content");
    expect(content).toBeInTheDocument();
  });

  it("renders unavailable screen if in local first / offline mode", async () => {
    vi.mocked(isLocalFirstMode).mockResolvedValue(true);
    render(
      <OfflineFeatureGate>
        <div>Protected Content</div>
      </OfflineFeatureGate>
    );
    const title = await screen.findByText("Función no disponible");
    expect(title).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
