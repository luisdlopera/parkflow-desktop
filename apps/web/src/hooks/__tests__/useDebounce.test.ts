import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../core/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("debounces and updates value after delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "hello", delay: 500 } }
    );

    expect(result.current).toBe("hello");

    rerender({ value: "world", delay: 500 });
    expect(result.current).toBe("hello");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("world");
  });

  it("multiple rapid calls only trigger after delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } }
    );

    rerender({ value: "b", delay: 500 });
    rerender({ value: "c", delay: 500 });
    rerender({ value: "d", delay: 500 });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("d");
  });

  it("cleans up timer on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const { unmount } = renderHook(() => useDebounce("test", 500));

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
