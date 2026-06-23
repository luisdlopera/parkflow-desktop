import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionExpiredModal } from "../SessionExpiredModal";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("SessionExpiredModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is not visible when isOpen is false", () => {
    render(
      <SessionExpiredModal isOpen={false} onClose={vi.fn()} />
    );
    expect(screen.queryByText("Sesión Expirada")).not.toBeInTheDocument();
  });

  it("shows when isOpen is true", () => {
    render(
      <SessionExpiredModal isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("Sesión Expirada")).toBeInTheDocument();
  });

  it("shows login button that redirects to login", async () => {
    const onClose = vi.fn();
    render(
      <SessionExpiredModal isOpen={true} onClose={onClose} />
    );
    const loginBtn = screen.getByText("Ir al login ahora");
    await userEvent.click(loginBtn);
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/login?expired=1&next=")
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("shows countdown timer", () => {
    render(
      <SessionExpiredModal isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("auto-redirects after countdown reaches 0", () => {
    vi.useFakeTimers();
    render(
      <SessionExpiredModal isOpen={true} onClose={vi.fn()} />
    );
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/login?expired=1&next=")
    );
  });
});
