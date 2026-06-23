import { renderHook, act } from "@testing-library/react";
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from "../core/useMediaQuery";

function createMatchMediaMock(matches: boolean, query: string) {
  const listeners: Record<string, Array<(e: MediaQueryListEvent) => void>> = {};
  return {
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((l) => l !== listener);
      }
    }),
    dispatchEvent: vi.fn(),
    _listeners: listeners,
  } as unknown as MediaQueryList & { _listeners: Record<string, Array<(e: MediaQueryListEvent) => void>> };
}

describe("useMediaQuery", () => {
  let matchMediaSpy: ReturnType<typeof vi.spyOn>;
  let mockImpl: ReturnType<typeof createMatchMediaMock>;

  beforeEach(() => {
    mockImpl = createMatchMediaMock(false, "(max-width: 767px)");
    matchMediaSpy = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) => {
        mockImpl.media = query;
        return mockImpl;
      }
    );
  });

  afterEach(() => {
    matchMediaSpy.mockRestore();
  });

  it("returns false initially when query does not match", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(false);
  });

  it("returns true when query matches", () => {
    mockImpl = createMatchMediaMock(true, "(max-width: 767px)");
    matchMediaSpy.mockImplementation(
      (query: string) => {
        mockImpl.media = query;
        return mockImpl;
      }
    );

    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(result.current).toBe(true);
  });

  it("updates value when change event fires", () => {
    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));

    expect(result.current).toBe(false);

    act(() => {
      const changeEvent = { matches: true, media: "(max-width: 767px)" } as MediaQueryListEvent;
      const addEventListenerCalls = matchMediaSpy.mock.results[0]?.value;
      const listener = addEventListenerCalls.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === "change"
      );
      if (listener) {
        listener[1](changeEvent);
      }
    });

    expect(result.current).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListenerSpy = vi.fn();
    mockImpl.removeEventListener = removeEventListenerSpy;
    matchMediaSpy.mockImplementation(
      (query: string) => {
        mockImpl.media = query;
        return mockImpl;
      }
    );

    const { unmount } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });
});

describe("useIsMobile", () => {
  it("queries max-width 767px", () => {
    const spy = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) => createMatchMediaMock(query === "(max-width: 767px)", query)
    );
    renderHook(() => useIsMobile());
    expect(spy).toHaveBeenCalledWith("(max-width: 767px)");
    spy.mockRestore();
  });
});

describe("useIsTablet", () => {
  it("queries min-width 768px and max-width 1023px", () => {
    const spy = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) => createMatchMediaMock(query === "(min-width: 768px) and (max-width: 1023px)", query)
    );
    renderHook(() => useIsTablet());
    expect(spy).toHaveBeenCalledWith("(min-width: 768px) and (max-width: 1023px)");
    spy.mockRestore();
  });
});

describe("useIsDesktop", () => {
  it("queries min-width 1024px", () => {
    const spy = vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) => createMatchMediaMock(query === "(min-width: 1024px)", query)
    );
    renderHook(() => useIsDesktop());
    expect(spy).toHaveBeenCalledWith("(min-width: 1024px)");
    spy.mockRestore();
  });
});
