import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SettingsPage from "../page";

vi.mock("@/components/layout/PageBackButton", () => ({
  PageBackButton: () => <div data-testid="page-back-button" />,
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the page header", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Idioma e interfaz")).toBeInTheDocument();
    expect(screen.getByText("Preferencias")).toBeInTheDocument();
  });

  it("renders language options inside Select", () => {
    render(<SettingsPage />);
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Español")).toBeInTheDocument();
  });

  it("shows welcome text in English by default (from language state)", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Welcome to ParkFlow")).toBeInTheDocument();
  });

  it("renders sidebar customization section with switches", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Personalización del Sidebar")).toBeInTheDocument();
    expect(screen.getByText("Mostrar estado del sistema")).toBeInTheDocument();
    expect(screen.getByText("Mostrar atajos de teclado")).toBeInTheDocument();
  });

  it("toggles system status switch and persists to localStorage", async () => {
    render(<SettingsPage />);
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("parkflow_ui_settings") ?? "{}");
      expect(stored.showSystemStatus).toBe(false);
    });
  });

  it("toggles keyboard shortcuts switch and persists to localStorage", async () => {
    render(<SettingsPage />);
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[1]);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("parkflow_ui_settings") ?? "{}");
      expect(stored.showKeyboardShortcuts).toBe(false);
    });
  });
});
