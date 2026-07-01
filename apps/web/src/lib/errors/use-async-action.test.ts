import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAsyncAction } from "./use-async-action";
import { FrontendActionError } from "./error-messages";
import { toast } from "@heroui/react";
import { errorService } from "@/lib/errors/error-service";

vi.mock("@/lib/errors/error-service", () => ({
  errorService: {
    normalize: vi.fn(),
    toast: {
      error: vi.fn(),
    },
  },
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
    vi.spyOn(toast, "success").mockImplementation(() => "mock-id" as any);
    vi.spyOn(toast, "danger").mockImplementation(() => "mock-id" as any);
    vi.mocked(errorService.normalize).mockReturnValue({
      message: "Error simulado",
      title: "Error",
      code: "UNKNOWN",
      severity: "error",
      retryable: true,
      technical: {} as any,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(errorService.toast.error).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    await act(async () => {
      await result.current.run(() => Promise.resolve());
    });

    expect(toast.success).toHaveBeenCalledWith("Guardado");
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

    await act(async () => {
      await result.current.run(() => Promise.reject(new Error("fail")));
    });

    expect(result.current.error).toBe("Error simulado");
    expect(result.current.isLoading).toBe(false);
    expect(errorService.toast.error).toHaveBeenCalled();
  });

  it("should not show error toast when showErrorToast is false", async () => {
    const { result } = renderHook(() =>
      useAsyncAction({ showErrorToast: false })
    );

    await act(async () => {
      await result.current.run(() => Promise.reject(new Error("silent")));
    });

    expect(result.current.error).toBe("Error simulado");
    expect(errorService.toast.error).not.toHaveBeenCalled();
  });

  it("should manage loading state", async () => {
    const { result } = renderHook(() => useAsyncAction<string>());

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
    const { result } = renderHook(() => useAsyncAction<string>());

    let returnValue: string | undefined;
    await act(async () => {
      returnValue = await result.current.run(() => Promise.reject(new Error("fail")));
    });

    expect(returnValue).toBeUndefined();
  });
});
