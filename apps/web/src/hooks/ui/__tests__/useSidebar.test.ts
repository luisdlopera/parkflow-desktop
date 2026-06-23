import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSidebar } from "../useSidebar";

const flags = vi.hoisted(() => ({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
}));

vi.mock("@/hooks/core/useMediaQuery", () => ({
  useIsMobile: () => flags.isMobile,
  useIsTablet: () => flags.isTablet,
  useIsDesktop: () => flags.isDesktop,
}));

describe("useSidebar", () => {
  beforeEach(() => {
    flags.isMobile = false;
    flags.isTablet = false;
    flags.isDesktop = true;
  });

  it("starts expanded on desktop", () => {
    const { result } = renderHook(() => useSidebar());

    expect(result.current.state).toBe("expanded");
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isCollapsed).toBe(false);
  });

  it("toggles between expanded and collapsed on desktop", () => {
    const { result } = renderHook(() => useSidebar());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.state).toBe("collapsed");
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isCollapsed).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.state).toBe("expanded");
    expect(result.current.isCollapsed).toBe(false);
  });

  it("can be collapsed and expanded explicitly", () => {
    const { result } = renderHook(() => useSidebar());

    act(() => {
      result.current.collapse();
    });
    expect(result.current.state).toBe("collapsed");

    act(() => {
      result.current.expand();
    });
    expect(result.current.state).toBe("expanded");
  });

  it("can be opened and closed", () => {
    const { result } = renderHook(() => useSidebar());

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.state).toBe("expanded");
  });

  it("responds to mobile viewport", async () => {
    const { result, rerender } = renderHook(() => useSidebar());

    flags.isMobile = true;
    flags.isDesktop = false;
    rerender();

    await waitFor(() => {
      expect(result.current.state).toBe("hidden");
      expect(result.current.isOpen).toBe(false);
    });

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it("responds to tablet viewport", () => {
    const { result, rerender } = renderHook(() => useSidebar());

    flags.isTablet = true;
    flags.isDesktop = false;
    rerender();

    expect(result.current.state).toBe("collapsed");
    expect(result.current.isOpen).toBe(true);
  });
});
