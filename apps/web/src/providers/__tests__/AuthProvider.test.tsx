import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { AuthProvider } from "@/providers/AuthProvider";

const mockUseSessionLoader = vi.fn(() => ({ isLoading: false }));

vi.mock("@/lib/hooks/use-session-loader", () => ({
  useSessionLoader: () => mockUseSessionLoader(),
}));

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when session is ready", () => {
    const { getByText } = render(
      <AuthProvider>
        <div>child content</div>
      </AuthProvider>
    );

    expect(getByText("child content")).toBeDefined();
  });

  it("shows loading state while restoring the session", () => {
    mockUseSessionLoader.mockReturnValueOnce({ isLoading: true });

    const { getByText } = render(
      <AuthProvider>
        <div>child content</div>
      </AuthProvider>
    );

    expect(getByText("Restaurando sesión...")).toBeDefined();
  });
});
