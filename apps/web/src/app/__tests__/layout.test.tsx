import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RootLayout from "../layout";

vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "--font-display" }),
  Instrument_Sans: () => ({ variable: "--font-body" }),
}));

vi.mock("@/lib/theme/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

vi.mock("../providers", () => ({
  Providers: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="providers">{children}</div>
  ),
}));

vi.mock("@/components/print/PrintQueueBootstrap", () => ({
  default: () => null,
}));

describe("RootLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children inside provider wrappers", () => {
    render(<RootLayout><div data-testid="child">hello</div></RootLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("providers")).toBeInTheDocument();
  });

  it("renders children inside theme-provider and providers chain", () => {
    render(<RootLayout><span data-testid="inner">content</span></RootLayout>);
    const providers = screen.getByTestId("providers");
    const themeProvider = screen.getByTestId("theme-provider");
    expect(providers).toContainElement(screen.getByTestId("inner"));
    expect(themeProvider).toContainElement(providers);
  });

  it("renders html element with lang='es' and font variables", () => {
    render(<RootLayout><div /></RootLayout>);
    const html = document.documentElement;
    expect(html).toHaveAttribute("lang", "es");
    expect(html.className).toContain("--font-display");
    expect(html.className).toContain("--font-body");
  });

  it("includes viewport meta tag", () => {
    render(<RootLayout><div /></RootLayout>);
    const meta = document.querySelector('meta[name="viewport"]');
    expect(meta).toBeInTheDocument();
    expect(meta).toHaveAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
    );
  });

  it("renders body with correct base classes", () => {
    render(<RootLayout><div /></RootLayout>);
    const body = document.body;
    expect(body.className).toContain("min-h-screen");
    expect(body.className).toContain("antialiased");
  });
});
