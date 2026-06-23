import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  prefersReducedMotion,
  getAnimationDuration,
  EASING,
  TRANSITIONS,
  getStaggerDelay,
  scrollToTop,
  getScrollBehavior,
} from "./utils";

describe("prefersReducedMotion", () => {
  it.each([
    [true, true],
    [false, false],
  ])("returns user preference: %p -> %p", (preference, expected) => {
    const mockMatch = { matches: preference };
    window.matchMedia = vi.fn().mockReturnValue(mockMatch);

    const result = prefersReducedMotion();
    expect(result).toBe(expected);
  });

  it("returns false on undefined window", () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    const result = prefersReducedMotion();
    expect(result).toBe(false);

    global.window = originalWindow;
  });

  it("checks prefers-reduced-motion media query", () => {
    const mockMatch = { matches: false };
    const mockFn = vi.fn().mockReturnValue(mockMatch);
    window.matchMedia = mockFn;

    prefersReducedMotion();
    expect(mockFn).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});

describe("getAnimationDuration", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  it("returns normal duration when motion not reduced", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const result = getAnimationDuration(0.3, 0.01);
    expect(result).toBe(0.3);
  });

  it("returns reduced duration when motion reduced", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const result = getAnimationDuration(0.3, 0.01);
    expect(result).toBe(0.01);
  });

  it.each([
    [0.1, 0.01],
    [0.3, 0.01],
    [0.5, 0.02],
    [1.0, 0.05],
  ])("respects custom reduced duration: %p -> %p", (normal, reduced) => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const result = getAnimationDuration(normal, reduced);
    expect(result).toBe(reduced);
  });

  it("uses default reduced duration when not provided", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const result = getAnimationDuration(0.5);
    expect(result).toBe(0.01);
  });

  it.each([
    [0, false, 0],
    [0.01, false, 0.01],
    [0.5, false, 0.5],
    [2.5, false, 2.5],
  ])("returns normal duration %p when not reduced", (normal, reduced, expected) => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const result = getAnimationDuration(normal, reduced as any);
    expect(result).toBe(expected);
  });
});

describe("EASING constants", () => {
  it("exports easeOut config", () => {
    expect(EASING.easeOut).toBeDefined();
    expect(Array.isArray(EASING.easeOut)).toBe(true);
    expect(EASING.easeOut.length).toBe(4);
  });

  it("exports easeOutQuad config", () => {
    expect(EASING.easeOutQuad).toBeDefined();
    expect(Array.isArray(EASING.easeOutQuad)).toBe(true);
  });

  it("exports easeOutCubic config", () => {
    expect(EASING.easeOutCubic).toBeDefined();
    expect(Array.isArray(EASING.easeOutCubic)).toBe(true);
  });

  it("exports easeInOut config", () => {
    expect(EASING.easeInOut).toBeDefined();
    expect(Array.isArray(EASING.easeInOut)).toBe(true);
  });

  it("exports smooth config", () => {
    expect(EASING.smooth).toBeDefined();
    expect(Array.isArray(EASING.smooth)).toBe(true);
  });

  it("all easing configs are 4-element arrays", () => {
    Object.values(EASING).forEach((config) => {
      expect(Array.isArray(config)).toBe(true);
      expect(config.length).toBe(4);
    });
  });

  it("all easing values are numbers", () => {
    Object.values(EASING).forEach((config) => {
      config.forEach((val) => {
        expect(typeof val).toBe("number");
      });
    });
  });
});

describe("TRANSITIONS constants", () => {
  it("exports fast transition", () => {
    expect(TRANSITIONS.fast).toBeDefined();
    expect(TRANSITIONS.fast.duration).toBeGreaterThan(0);
  });

  it("exports normal transition", () => {
    expect(TRANSITIONS.normal).toBeDefined();
    expect(TRANSITIONS.normal.duration).toBeGreaterThan(TRANSITIONS.fast.duration);
  });

  it("exports slow transition", () => {
    expect(TRANSITIONS.slow).toBeDefined();
    expect(TRANSITIONS.slow.duration).toBeGreaterThan(TRANSITIONS.normal.duration);
  });

  it("exports spring transition", () => {
    expect(TRANSITIONS.spring).toBeDefined();
    expect(TRANSITIONS.spring.type).toBe("spring");
  });

  it("exports springBouncy transition", () => {
    expect(TRANSITIONS.springBouncy).toBeDefined();
    expect(TRANSITIONS.springBouncy.type).toBe("spring");
  });

  it("fast < normal < slow in duration", () => {
    expect(TRANSITIONS.fast.duration).toBeLessThan(TRANSITIONS.normal.duration);
    expect(TRANSITIONS.normal.duration).toBeLessThan(TRANSITIONS.slow.duration);
  });

  it.each([
    ["fast", TRANSITIONS.fast],
    ["normal", TRANSITIONS.normal],
    ["slow", TRANSITIONS.slow],
    ["spring", TRANSITIONS.spring],
    ["springBouncy", TRANSITIONS.springBouncy],
  ])("transition %p is defined", (name, transition) => {
    expect(transition).toBeDefined();
  });
});

describe("getStaggerDelay", () => {
  it.each([
    [0, 0.1, 0],
    [1, 0.1, 0.1],
    [2, 0.1, 0.2],
    [5, 0.1, 0.5],
    [10, 0.1, 1.0],
  ])("calculates stagger delay: index %p, base %p -> %p", (index, base, expected) => {
    const result = getStaggerDelay(index, base);
    expect(result).toBe(expected);
  });

  it("uses default base delay when not provided", () => {
    const result = getStaggerDelay(5);
    expect(result).toBe(0.5); // 5 * 0.1
  });

  it("respects custom base delay", () => {
    expect(getStaggerDelay(0, 0.05)).toBe(0);
    expect(getStaggerDelay(1, 0.05)).toBe(0.05);
    expect(getStaggerDelay(3, 0.05)).toBeCloseTo(0.15, 5);
  });

  it("handles zero delay", () => {
    const result = getStaggerDelay(5, 0);
    expect(result).toBe(0);
  });

  it.each([
    [0],
    [1],
    [10],
    [100],
  ])("handles various indices: %p", (index) => {
    const result = getStaggerDelay(index, 0.1);
    expect(result).toBeCloseTo(index * 0.1, 5);
  });

  it("calculates multiplicative delays", () => {
    const delays = [0, 1, 2, 3, 4].map((i) => getStaggerDelay(i, 0.2));
    delays.forEach((delay, i) => {
      expect(delay).toBeCloseTo(i * 0.2, 5);
    });
  });
});

describe("scrollToTop", () => {
  it("scrolls to top with smooth behavior by default", () => {
    const mockScroll = vi.fn();
    window.scrollTo = mockScroll;

    scrollToTop();

    expect(mockScroll).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("respects smooth parameter as true", () => {
    const mockScroll = vi.fn();
    window.scrollTo = mockScroll;

    scrollToTop(true);

    expect(mockScroll).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("uses auto behavior when smooth is false", () => {
    const mockScroll = vi.fn();
    window.scrollTo = mockScroll;

    scrollToTop(false);

    expect(mockScroll).toHaveBeenCalledWith(0, 0);
  });

  it("returns undefined on undefined window", () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    const result = scrollToTop();
    expect(result).toBeUndefined();

    global.window = originalWindow;
  });

  it.each([
    [true],
    [false],
  ])("handles smooth parameter: %p", (smooth) => {
    const mockScroll = vi.fn();
    window.scrollTo = mockScroll;

    scrollToTop(smooth);

    expect(mockScroll).toHaveBeenCalled();
  });
});

describe("getScrollBehavior", () => {
  beforeEach(() => {
    Object.defineProperty(window, "navigator", {
      value: { userAgent: "Mozilla/5.0" },
      writable: true,
    });
  });

  it("detects iOS Safari", () => {
    Object.defineProperty(window, "navigator", {
      value: {
        userAgent:
          "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/604.1",
      },
      writable: true,
    });

    const result = getScrollBehavior();
    expect(result).toBe("auto");
  });

  it("detects Chrome on Windows", () => {
    Object.defineProperty(window, "navigator", {
      value: {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      writable: true,
    });

    const result = getScrollBehavior();
    expect(result).toBe("smooth");
  });

  it("handles iOS devices", () => {
    // The function checks for iPad/iPhone/iPod AND Safari
    const iosUAs = [
      {
        ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 Version/14.0 Safari/605.1.15",
        expected: "auto",
      },
      {
        ua: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 Version/14.0 Safari/605.1.15",
        expected: "auto",
      },
    ];

    iosUAs.forEach(({ ua, expected }) => {
      Object.defineProperty(window, "navigator", {
        value: { userAgent: ua },
        writable: true,
      });

      const result = getScrollBehavior();
      expect(result).toBe(expected);
    });
  });

  it("returns auto on undefined window", () => {
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    const result = getScrollBehavior();
    expect(result).toBe("auto");

    global.window = originalWindow;
  });

  it("returns smooth for non-iOS Safari", () => {
    Object.defineProperty(window, "navigator", {
      value: {
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
      },
      writable: true,
    });

    const result = getScrollBehavior();
    expect(result).toBe("smooth");
  });

  it("returns either auto or smooth", () => {
    const result = getScrollBehavior();
    expect(["auto", "smooth"]).toContain(result);
  });
});

describe("Animation utilities integration", () => {
  it("coordinated stagger and duration", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const index = 3;
    const stagger = getStaggerDelay(index, 0.05);
    const duration = getAnimationDuration(0.3, 0.01);

    expect(stagger).toBeCloseTo(0.15, 5);
    expect(duration).toBe(0.3);
  });

  it("duration respects reduced motion even with stagger", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    const duration = getAnimationDuration(0.5, 0.02);
    const stagger = getStaggerDelay(2, 0.1);

    expect(duration).toBe(0.02);
    expect(stagger).toBeCloseTo(0.2, 5);
  });
});
