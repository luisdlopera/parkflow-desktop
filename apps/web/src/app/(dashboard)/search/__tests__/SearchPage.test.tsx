import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SearchPage from "../page";

vi.mock("next/navigation", () => ({
  usePathname: () => "",
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams("")),

}));

vi.mock("@/features/search/hooks/useSearch", () => ({
  useSearch: vi.fn().mockReturnValue({ results: null, isLoading: false }),
}));

vi.mock("@/components/bridge/Chip", () => ({
  Chip: ({ children }: any) => <span data-testid="chip">{children}</span>,
}));

import { useSearch } from "@/features/search/hooks/useSearch";
import { useSearchParams } from "next/navigation";

describe("SearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearch).mockReturnValue({ results: null, isLoading: false });
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(""));
    localStorage.clear();
  });

  it("renders search page header", () => {
    render(<SearchPage />);
    expect(screen.getByText("Búsqueda global")).toBeInTheDocument();
    expect(screen.getByText("Todo lo que necesita la persona operando")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<SearchPage />);
    expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument();
  });

  it("renders scope filter buttons", () => {
    render(<SearchPage />);
    expect(screen.getByText("Todo")).toBeInTheDocument();
    expect(screen.getByText("vehicles")).toBeInTheDocument();
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("parking")).toBeInTheDocument();
  });

  it("shows empty state header when no query is entered", () => {
    render(<SearchPage />);
    expect(screen.getByText("Ingresos")).toBeInTheDocument();
    expect(screen.getByText("Salidas")).toBeInTheDocument();
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
  });

  it("shows no results message when query returns empty results", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("q=ZZZ999"));
    vi.mocked(useSearch).mockReturnValue({
      results: { results: { VEHICLE: [] } },
      isLoading: false,
      error: null,
    });
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText("No hay resultados")).toBeInTheDocument();
    });
  });

  it("displays search results grouped by type", async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("q=ABC"));
    vi.mocked(useSearch).mockReturnValue({
      results: {
        results: {
          VEHICLE: [
            { id: "v1", type: "VEHICLE", title: "ABC123", subtitle: "Carro", actionUrl: "/test", metadata: { status: "ACTIVE" } },
          ],
        },
      },
      isLoading: false,
      error: null,
    });
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText("ABC123")).toBeInTheDocument();
    });
  });
});
