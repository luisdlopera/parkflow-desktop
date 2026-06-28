import { renderHook, act, waitFor } from "@testing-library/react";
import { useAnimatedAction } from "../ui/useAnimatedAction";

const mockShowAnimatedToast = vi.fn();

vi.mock("@/lib/toast/animated-toast", () => ({
  showAnimatedToast: (...args: unknown[]) => mockShowAnimatedToast(...args),
}));

describe("useAnimatedAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in idle state with isLoading false and error null", () => {
    const { result } = renderHook(() => useAnimatedAction());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets isLoading to true during execution", async () => {
    const { result } = renderHook(() => useAnimatedAction());

    let resolvePromise!: (v: string) => void;
    const action = vi.fn().mockReturnValue(new Promise<string>((resolve) => { resolvePromise = resolve; }));

    let executePromise: Promise<string | null>;
    act(() => {
      executePromise = result.current.execute(action);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolvePromise("done");
    });

    await act(async () => {
      await executePromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("sets isLoading to false after successful execution", async () => {
    const { result } = renderHook(() => useAnimatedAction({ successMessage: "Success!" }));

    const action = vi.fn().mockResolvedValue("result");

    await act(async () => {
      await result.current.execute(action);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("shows success toast on success when showToast is true", async () => {
    const { result } = renderHook(() => useAnimatedAction({ successMessage: "Success!" }));

    await act(async () => {
      await result.current.execute(() => Promise.resolve("result"));
    });

    expect(mockShowAnimatedToast).toHaveBeenCalledWith("Success!", "success");
  });

  it("does not show toast when showToast is false", async () => {
    const { result } = renderHook(() =>
      useAnimatedAction({ successMessage: "Success!", showToast: false })
    );

    await act(async () => {
      await result.current.execute(() => Promise.resolve("result"));
    });

    expect(mockShowAnimatedToast).not.toHaveBeenCalled();
  });

  it("calls onSuccess callback on success", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAnimatedAction({ onSuccess }));

    await act(async () => {
      await result.current.execute(() => Promise.resolve("result"));
    });

    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("sets error state on failure", async () => {
    const testError = new Error("Something went wrong");
    const { result } = renderHook(() => useAnimatedAction({ errorMessage: "Failed!" }));

    await act(async () => {
      await result.current.execute(() => Promise.reject(testError));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(testError);
  });

  it("shows error toast on failure when showToast is true", async () => {
    const { result } = renderHook(() => useAnimatedAction({ errorMessage: "Failed!" }));

    await act(async () => {
      await result.current.execute(() => Promise.reject(new Error("fail")));
    });

    expect(mockShowAnimatedToast).toHaveBeenCalledWith("Failed!", "error");
  });

  it("calls onError callback on failure", async () => {
    const onError = vi.fn();
    const testError = new Error("fail");
    const { result } = renderHook(() => useAnimatedAction({ onError }));

    await act(async () => {
      await result.current.execute(() => Promise.reject(testError));
    });

    expect(onError).toHaveBeenCalledWith(testError);
  });

  it("wraps non-Error thrown values in Error", async () => {
    const { result } = renderHook(() => useAnimatedAction());

    await act(async () => {
      await result.current.execute(() => Promise.reject("string error"));
    });

    expect(result.current.error).toEqual(new Error("string error"));
  });

  it("returns null from execute on failure", async () => {
    const { result } = renderHook(() => useAnimatedAction());

    let returned: string | null = "not null";
    await act(async () => {
      returned = await result.current.execute(() => Promise.reject(new Error("fail")));
    });

    expect(returned).toBeNull();
  });

  it("returns the action result on success", async () => {
    const { result } = renderHook(() => useAnimatedAction());

    let returned: string | null = null;
    await act(async () => {
      returned = await result.current.execute(() => Promise.resolve("success-result"));
    });

    expect(returned).toBe("success-result");
  });

  it("clears error state on re-execute", async () => {
    const { result } = renderHook(() => useAnimatedAction());

    await act(async () => {
      await result.current.execute(() => Promise.reject(new Error("first fail")));
    });

    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await result.current.execute(() => Promise.resolve("ok"));
    });

    expect(result.current.error).toBeNull();
  });
});
