import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/useAutoSave", () => ({
  useCrashRecovery: vi.fn(),
}));

import { CrashRecoveryDialog } from "./CrashRecoveryDialog";
import { useCrashRecovery } from "@/lib/hooks/useAutoSave";

describe("CrashRecoveryDialog", () => {
  beforeEach(() => {
    vi.mocked(useCrashRecovery).mockReset();
  });

  it("shows recovered data and restores it", () => {
    const onRestore = vi.fn();
    const onDismiss = vi.fn();
    vi.mocked(useCrashRecovery).mockReturnValue({
      checkForRecovery: vi.fn(() => ({ recovered: true, data: { ticket: "123" }, timestamp: new Date("2026-05-12T10:00:00Z") })),
      clearRecovery: vi.fn(),
    });

    render(<CrashRecoveryDialog formKey="entry-form" onRestore={onRestore} onDismiss={onDismiss} />);

    expect(screen.getByRole("heading", { name: "Recuperar datos" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Recuperar datos/i }));
    expect(onRestore).toHaveBeenCalledWith({ ticket: "123" });
  });

  it("dismisses and clears recovery state", () => {
    const onRestore = vi.fn();
    const onDismiss = vi.fn();
    const clearRecovery = vi.fn();
    vi.mocked(useCrashRecovery).mockReturnValue({
      checkForRecovery: vi.fn(() => ({ recovered: true, data: { ticket: "123" }, timestamp: new Date("2026-05-12T10:00:00Z") })),
      clearRecovery,
    });

    render(<CrashRecoveryDialog formKey="entry-form" onRestore={onRestore} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: /Descartar/i }));
    expect(clearRecovery).toHaveBeenCalledWith("entry-form");
    expect(onDismiss).toHaveBeenCalled();
  });
});
