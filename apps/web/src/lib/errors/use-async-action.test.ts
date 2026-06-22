import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAsyncAction } from "./use-async-action";
import { FrontendActionError } from "./error-messages";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));
vi.mock("./error-messages", () => ({
  getUserFriendlyErrorMessage: () => "Error simulado",
  FrontendActionError: {
    UNKNOWN: "UNKNOWN",
    SAVE_DATA: "SAVE_DATA",
    LOAD_DATA: "LOAD_DATA",
  },
}));

describe("useAsyncAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return result on successful action", async () => {
    const { result } = renderHook(() => useAsyncAction<string>());

    let returnValue: string | undefined;
    await act(async () => {
      returnValue = await result.current.run(() => Promise.resolve("ok"));
    });

    expect(returnValue).toBe("ok");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should show success toast when successMsg is provided", async () => {
    const { result } = renderHook(() =>
      useAsyncAction({ successMsg: "Guardado" })
    );
    const toast = await import("@heroui/react");

    await act(async () => {
      await result.current.run(() => Promise.resolve());
    });

    expect(toast.toast.success).toHaveBeenCalledWith("Guardado");
  });

  it("should call onSuccess callback", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useAsyncAction({ onSuccess })
    );

    await act(async () => {
      await result.current.run(() => Promise.resolve("data"));
    });

    expect(onSuccess).toHaveBeenCalledWith("data");
  });

  it("should set error on failure and show error toast by default", async () => {
    const { result } = renderHook(() =>
      useAsyncAction({ errorContext: FrontendActionError.SAVE_DATA })
    );
    const toast = await import("@heroui/react");

    await act(async () => {
      await result.current.run(() => Promise.reject(new Error("fail")));
    });

    expect(result.current.error).toBe("Error simulado");
    expect(result.current.isLoading).toBe(false);
    expect(toast.toast.danger).toHaveBeenCalled();
  });

  it("should not show error toast when showErrorToast is false", async () => {
    const { result } = renderHook(() =>
      useAsyncAction({ showErrorToast: false })
    );
    const toast = await import("@heroui/react");

    await act(async () => {
      await result.current.run(() => Promise.reject(new Error("silent")));
    });

    expect(result.current.error).toBe("Error simulado");
    expect(toast.toast.danger).not.toHaveBeenCalled();
  });

  it("should manage loading state", async () => {
    const { result } = renderHook(() => useAsyncAction());

    let resolvePromise!: (v: string) => void;
    const promise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });

    let runPromise: Promise<string | undefined>;
    act(() => {
      runPromise = result.current.run(() => promise);
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise("done");
      await runPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("should clear error", () => {
    const { result } = renderHook(() => useAsyncAction());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("should return undefined on failure", async () => {
    const { result } = renderHook(() => useAsyncAction());

    let returnValue: string | undefined;
    await act(async () => {
      returnValue = await result.current.run(() => Promise.reject(new Error("fail")));
    });

    expect(returnValue).toBeUndefined();
  });
});
