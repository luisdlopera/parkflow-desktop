import { render, screen } from "@testing-library/react";
import * as Sentry from "@sentry/nextjs";
import GlobalError from "@/app/global-error";

jest.mock("@sentry/nextjs");
jest.mock("next/error");

describe("GlobalError", () => {
  const mockError = new Error("Test error message");
  const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders the error component", () => {
    render(<GlobalError error={mockError} />);
    // Component renders without crashing
    expect(screen.queryByRole("heading")).toBeInTheDocument();
  });

  it("calls Sentry.captureException with the error", () => {
    render(<GlobalError error={mockError} />);
    expect(Sentry.captureException).toHaveBeenCalledWith(mockError);
  });

  it("logs error to console", () => {
    render(<GlobalError error={mockError} />);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Global error:", mockError);
  });

  it("handles error digest prop", () => {
    const errorWithDigest = {
      ...mockError,
      digest: "test-digest-123",
    };
    render(<GlobalError error={errorWithDigest as Error & { digest: string }} />);
    expect(Sentry.captureException).toHaveBeenCalledWith(errorWithDigest);
  });

  it("handles errors without message gracefully", () => {
    const errorNoMessage = new Error();
    render(<GlobalError error={errorNoMessage} />);
    expect(Sentry.captureException).toHaveBeenCalledWith(errorNoMessage);
  });

  it("does not break if Sentry initialization fails", () => {
    (Sentry.captureException as jest.Mock).mockImplementation(() => {
      throw new Error("Sentry not initialized");
    });

    expect(() => {
      render(<GlobalError error={mockError} />);
    }).not.toThrow();
  });
});
