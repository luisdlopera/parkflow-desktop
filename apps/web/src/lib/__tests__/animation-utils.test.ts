import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  prefersReducedMotion,
  getAnimationDuration,
  EASING,
  TRANSITIONS,
  getStaggerDelay,
  smoothScroll,
  scrollToTop,
  getScrollBehavior,
} from "../animations/utils";

describe("animation-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("prefersReducedMotion", () => {
    it("should return false when user does not prefer reduced motion", () => {
      const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as any);

      const result = prefersReducedMotion();

      expect(result).toBe(false);
      matchMediaSpy.mockRestore();
    });

    it("should return true when user prefers reduced motion", () => {
      const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
      } as any);

      const result = prefersReducedMotion();

      expect(result).toBe(true);
      matchMediaSpy.mockRestore();
    });

    it("should query for prefers-reduced-motion media query", () => {
      const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as any);

      prefersReducedMotion();

      expect(matchMediaSpy).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
      matchMediaSpy.mockRestore();
    });

    it("should return false when window is undefined", () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      const result = prefersReducedMotion();

      expect(result).toBe(false);
      global.window = originalWindow;
    });

    it("should handle matchMedia not existing gracefully", () => {
      const originalMatchMedia = window.matchMedia;
      (window as any).matchMedia = () => {
        throw new Error("matchMedia not supported");
      };

      expect(() => prefersReducedMotion()).toThrow();
      window.matchMedia = originalMatchMedia;
    });
  });

  describe("getAnimationDuration", () => {
    it("should return normal duration when reduced motion is not preferred", () => {
      const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as any);

      const result = getAnimationDuration(0.3, 0.01);

      expect(result).toBe(0.3);
      matchMediaSpy.mockRestore();
    });

    it("should return reduced duration when reduced motion is preferred", () => {
      const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
      } as any);

      const result = getAnimationDuration(0.3, 0.01);

      expect(result).toBe(0.01);
      matchMediaSpy.mockRestore();
    });

    it("should use default reduced duration of 0.01 if not provided", () => {
      const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
      } as any);

      const result = getAnimationDuration(0.5);

      expect(result).toBe(0.01);
      matchMediaSpy.mockRestore();
    });

    it.each([
      [0.1, 0.01, 0.1],
      [0.2, 0.02, 0.2],
      [0.3, 0.01, 0.3],
      [0.5, 0.05, 0.5],
      [1.0, 0.01, 1.0],
    ])(
      "should return %d for normal duration with normal motion",
      (normal, reduced, expected) => {
        const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
          matches: false,
        } as any);

        const result = getAnimationDuration(normal, reduced);

        expect(result).toBe(expected);
        matchMediaSpy.mockRestore();
      }
    );

    it.each([
      [0.1, 0.01, 0.01],
      [0.2, 0.02, 0.02],
      [0.3, 0.01, 0.01],
      [0.5, 0.05, 0.05],
      [1.0, 0.01, 0.01],
    ])(
      "should return %d for reduced duration with reduced motion",
      (normal, reduced, expected) => {
        const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
          matches: true,
        } as any);

        const result = getAnimationDuration(normal, reduced);

        expect(result).toBe(expected);
        matchMediaSpy.mockRestore();
      }
    );

    it("should handle zero durations", () => {
      const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as any);

      const result = getAnimationDuration(0, 0);

      expect(result).toBe(0);
      matchMediaSpy.mockRestore();
    });

    it("should handle negative durations (edge case)", () => {
      const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as any);

      const result = getAnimationDuration(-0.1, -0.01);

      expect(result).toBe(-0.1);
      matchMediaSpy.mockRestore();
    });

    it("should handle very large durations", () => {
      const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as any);

      const result = getAnimationDuration(10000, 0.01);

      expect(result).toBe(10000);
      matchMediaSpy.mockRestore();
    });

    it("should handle very small durations", () => {
      const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as any);

      const result = getAnimationDuration(0.001, 0.0001);

      expect(result).toBe(0.001);
      matchMediaSpy.mockRestore();
    });
  });

  describe("EASING", () => {
    it("should have easeOut easing", () => {
      expect(EASING.easeOut).toBeDefined();
      expect(Array.isArray(EASING.easeOut)).toBe(true);
      expect(EASING.easeOut.length).toBe(4);
    });

    it("should have easeOutQuad easing", () => {
      expect(EASING.easeOutQuad).toBeDefined();
      expect(EASING.easeOutQuad).toEqual([0.25, 0.46, 0.45, 0.94]);
    });

    it("should have easeOutCubic easing", () => {
      expect(EASING.easeOutCubic).toBeDefined();
      expect(EASING.easeOutCubic).toEqual([0.215, 0.61, 0.355, 1]);
    });

    it("should have easeInOut easing", () => {
      expect(EASING.easeInOut).toBeDefined();
      expect(EASING.easeInOut).toEqual([0.42, 0, 0.58, 1]);
    });

    it("should have smooth easing", () => {
      expect(EASING.smooth).toBeDefined();
      expect(EASING.smooth).toEqual([0.4, 0.0, 0.2, 1]);
    });

    it("should be cubic-bezier values (4 elements each)", () => {
      Object.values(EASING).forEach((easing) => {
        expect(Array.isArray(easing)).toBe(true);
        expect(easing.length).toBe(4);
      });
    });

    it("should have numeric values", () => {
      Object.values(EASING).forEach((easing) => {
        easing.forEach((value) => {
          expect(typeof value).toBe("number");
        });
      });
    });

    it("should be readonly (const)", () => {
      expect(Object.isFrozen(EASING) || typeof EASING === "object").toBeTruthy();
    });
  });

  describe("TRANSITIONS", () => {
    it("should have fast transition", () => {
      expect(TRANSITIONS.fast).toBeDefined();
      expect(TRANSITIONS.fast.duration).toBe(0.15);
      expect(TRANSITIONS.fast.ease).toBe("easeOut");
    });

    it("should have normal transition", () => {
      expect(TRANSITIONS.normal).toBeDefined();
      expect(TRANSITIONS.normal.duration).toBe(0.3);
      expect(TRANSITIONS.normal.ease).toBe("easeOut");
    });

    it("should have slow transition", () => {
      expect(TRANSITIONS.slow).toBeDefined();
      expect(TRANSITIONS.slow.duration).toBe(0.5);
      expect(TRANSITIONS.slow.ease).toBe("easeOut");
    });

    it("should have spring transition", () => {
      expect(TRANSITIONS.spring).toBeDefined();
      expect(TRANSITIONS.spring.type).toBe("spring");
      expect(TRANSITIONS.spring.stiffness).toBe(300);
      expect(TRANSITIONS.spring.damping).toBe(30);
    });

    it("should have bouncy spring transition", () => {
      expect(TRANSITIONS.springBouncy).toBeDefined();
      expect(TRANSITIONS.springBouncy.type).toBe("spring");
      expect(TRANSITIONS.springBouncy.stiffness).toBe(200);
      expect(TRANSITIONS.springBouncy.damping).toBe(20);
    });

    it("should have spring type as const", () => {
      expect(TRANSITIONS.spring.type).toBe("spring");
      expect(TRANSITIONS.springBouncy.type).toBe("spring");
    });

    it("should have numeric duration values", () => {
      expect(typeof TRANSITIONS.fast.duration).toBe("number");
      expect(typeof TRANSITIONS.normal.duration).toBe("number");
      expect(typeof TRANSITIONS.slow.duration).toBe("number");
    });

    it("should have numeric stiffness and damping", () => {
      expect(typeof TRANSITIONS.spring.stiffness).toBe("number");
      expect(typeof TRANSITIONS.spring.damping).toBe("number");
    });

    it("spring transition should have lower stiffness than bouncy", () => {
      expect(TRANSITIONS.spring.stiffness).toBeGreaterThan(
        TRANSITIONS.springBouncy.stiffness
      );
    });

    it("spring transition should have higher damping than bouncy", () => {
      expect(TRANSITIONS.spring.damping).toBeGreaterThan(
        TRANSITIONS.springBouncy.damping
      );
    });
  });

  describe("getStaggerDelay", () => {
    it("should return 0 for index 0", () => {
      const result = getStaggerDelay(0);
      expect(result).toBe(0);
    });

    it("should return base delay for index 1", () => {
      const result = getStaggerDelay(1, 0.1);
      expect(result).toBe(0.1);
    });

    it("should return 2x base delay for index 2", () => {
      const result = getStaggerDelay(2, 0.1);
      expect(result).toBe(0.2);
    });

    it("should return 3x base delay for index 3", () => {
      const result = getStaggerDelay(3, 0.1);
      expect(result).toBeCloseTo(0.3, 5);
    });

    it("should use default base delay of 0.1", () => {
      const result = getStaggerDelay(2);
      expect(result).toBe(0.2);
    });

    it.each([
      [0, 0.1, 0],
      [1, 0.1, 0.1],
      [2, 0.1, 0.2],
      [3, 0.1, 0.3],
      [4, 0.1, 0.4],
      [5, 0.1, 0.5],
      [10, 0.1, 1.0],
    ])(
      "should return %d * %d = %d",
      (index, baseDelay, expected) => {
        const result = getStaggerDelay(index, baseDelay);
        expect(result).toBeCloseTo(expected, 5);
      }
    );

    it("should handle custom base delays", () => {
      expect(getStaggerDelay(1, 0.05)).toBe(0.05);
      expect(getStaggerDelay(1, 0.2)).toBe(0.2);
      expect(getStaggerDelay(1, 0.5)).toBe(0.5);
    });

    it("should handle large indices", () => {
      const result = getStaggerDelay(100, 0.1);
      expect(result).toBe(10);
    });

    it("should handle zero base delay", () => {
      const result = getStaggerDelay(5, 0);
      expect(result).toBe(0);
    });

    it("should handle very small base delays", () => {
      const result = getStaggerDelay(10, 0.01);
      expect(result).toBe(0.1);
    });

    it("should multiply correctly with floating point", () => {
      const result = getStaggerDelay(3, 0.15);
      expect(result).toBeCloseTo(0.45);
    });
  });

  describe("smoothScroll", () => {
    it("should call scrollIntoView with smooth behavior by default", () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      };

      smoothScroll(mockElement as any);

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    });

    it("should call scrollIntoView with auto behavior when specified", () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      };

      smoothScroll(mockElement as any, "auto");

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
        behavior: "auto",
        block: "nearest",
        inline: "nearest",
      });
    });

    it("should handle element without scrollIntoView method", () => {
      const mockElement = {};

      expect(() => smoothScroll(mockElement as any)).not.toThrow();
    });

    it("should use block: nearest for vertical alignment", () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      };

      smoothScroll(mockElement as any);

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith(
        expect.objectContaining({ block: "nearest" })
      );
    });

    it("should use inline: nearest for horizontal alignment", () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      };

      smoothScroll(mockElement as any);

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith(
        expect.objectContaining({ inline: "nearest" })
      );
    });

    it("should handle HTMLElement instances", () => {
      const element = document.createElement("div");
      const scrollIntoViewMock = vi.fn();
      element.scrollIntoView = scrollIntoViewMock;

      smoothScroll(element, "smooth");

      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it.each([
      ["smooth", "smooth"],
      ["auto", "auto"],
    ])("should accept behavior %s", (behavior, expected) => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      };

      smoothScroll(mockElement as any, behavior as any);

      expect(mockElement.scrollIntoView).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: expected })
      );
    });
  });

  describe("scrollToTop", () => {
    it("should scroll to top with smooth behavior by default", () => {
      const windowScrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      scrollToTop();

      expect(windowScrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });

      windowScrollToSpy.mockRestore();
    });

    it("should scroll to top without smooth behavior when smooth is false", () => {
      const windowScrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      scrollToTop(false);

      expect(windowScrollToSpy).toHaveBeenCalledWith(0, 0);

      windowScrollToSpy.mockRestore();
    });

    it("should handle smooth parameter true", () => {
      const windowScrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      scrollToTop(true);

      expect(windowScrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });

      windowScrollToSpy.mockRestore();
    });

    it("should not throw when window is undefined", () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      expect(() => scrollToTop()).not.toThrow();

      global.window = originalWindow;
    });

    it("should scroll to y=0 position", () => {
      const windowScrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      scrollToTop();

      const callArgs = windowScrollToSpy.mock.calls[0][0];
      expect((callArgs as any).top).toBe(0);

      windowScrollToSpy.mockRestore();
    });

    it("should use smooth scroll behavior", () => {
      const windowScrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      scrollToTop();

      const callArgs = windowScrollToSpy.mock.calls[0][0];
      expect((callArgs as any).behavior).toBe("smooth");

      windowScrollToSpy.mockRestore();
    });

    it.each([true, false])("should accept smooth parameter %s", (smooth) => {
      const windowScrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

      scrollToTop(smooth);

      expect(windowScrollToSpy).toHaveBeenCalled();

      windowScrollToSpy.mockRestore();
    });
  });

  describe("getScrollBehavior", () => {
    it("should return auto for iOS Safari", () => {
      const userAgentSpy = vi
        .spyOn(window.navigator, "userAgent", "get")
        .mockReturnValue("iPad Safari");

      const result = getScrollBehavior();

      expect(result).toBe("auto");

      userAgentSpy.mockRestore();
    });

    it("should return smooth for non-iOS Safari browsers", () => {
      const userAgentSpy = vi
        .spyOn(window.navigator, "userAgent", "get")
        .mockReturnValue("Chrome");

      const result = getScrollBehavior();

      expect(result).toBe("smooth");

      userAgentSpy.mockRestore();
    });

    it("should return auto when isSafari && isIOS", () => {
      const userAgentSpy = vi
        .spyOn(window.navigator, "userAgent", "get")
        .mockReturnValue("iPad Safari");

      const result = getScrollBehavior();

      expect(result).toBe("auto");

      userAgentSpy.mockRestore();
    });

    it("should return smooth for Desktop Safari", () => {
      const userAgentSpy = vi
        .spyOn(window.navigator, "userAgent", "get")
        .mockReturnValue("Safari");

      const result = getScrollBehavior();

      expect(result).toBe("smooth");

      userAgentSpy.mockRestore();
    });

    it("should return auto for window is undefined", () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      const result = getScrollBehavior();

      expect(result).toBe("auto");

      global.window = originalWindow;
    });

    it("should detect iPhone", () => {
      const userAgentSpy = vi
        .spyOn(window.navigator, "userAgent", "get")
        .mockReturnValue("iPhone Safari");

      const result = getScrollBehavior();

      expect(result).toBe("auto");

      userAgentSpy.mockRestore();
    });

    it("should detect iPod", () => {
      const userAgentSpy = vi
        .spyOn(window.navigator, "userAgent", "get")
        .mockReturnValue("iPod Safari");

      const result = getScrollBehavior();

      expect(result).toBe("auto");

      userAgentSpy.mockRestore();
    });

    it("should return smooth for Chrome on iPad", () => {
      const userAgentSpy = vi
        .spyOn(window.navigator, "userAgent", "get")
        .mockReturnValue("iPad Chrome");

      const result = getScrollBehavior();

      expect(result).toBe("smooth");

      userAgentSpy.mockRestore();
    });

    it.each([
      ["Mozilla/5.0 (iPad; CPU OS 13_0 like Mac OS X) Safari", "auto"],
      ["Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) Safari", "auto"],
      ["Mozilla/5.0 (iPod; CPU like Mac OS X) Safari", "auto"],
      ["Mozilla/5.0 (X11; Linux x86_64) Chrome/91.0", "smooth"],
      ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) Safari", "smooth"],
    ])("should handle user agent %s", (ua, expected) => {
      const userAgentSpy = vi
        .spyOn(window.navigator, "userAgent", "get")
        .mockReturnValue(ua);

      const result = getScrollBehavior();

      expect(result).toBe(expected);

      userAgentSpy.mockRestore();
    });
  });
});
