/**
 * Animation Utilities
 * Helper functions for working with animations and motion
 */

/**
 * Check if user prefers reduced motion (accessibility)
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Reduced duration for animations when user prefers reduced motion
 */
export const getAnimationDuration = (
  normalDuration: number,
  reducedDuration: number = 0.01
): number => {
  return prefersReducedMotion() ? reducedDuration : normalDuration;
};

/**
 * Ease configs for common animations
 */
export const EASING = {
  easeOut: [0.34, 1.56, 0.64, 1], // cubic-bezier - bouncy exit
  easeOutQuad: [0.25, 0.46, 0.45, 0.94],
  easeOutCubic: [0.215, 0.61, 0.355, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  smooth: [0.4, 0.0, 0.2, 1],
} as const;

/**
 * Common transition configs
 */
export const TRANSITIONS = {
  fast: { duration: 0.15, ease: "easeOut" },
  normal: { duration: 0.3, ease: "easeOut" },
  slow: { duration: 0.5, ease: "easeOut" },
  spring: { type: "spring" as const, stiffness: 300, damping: 30 },
  springBouncy: { type: "spring" as const, stiffness: 200, damping: 20 },
} as const;

/**
 * Delay stagger for container animations
 */
export const getStaggerDelay = (index: number, baseDelay = 0.1): number => {
  return index * baseDelay;
};

/**
 * Smoothly scroll to element with requestAnimationFrame
 */
export const smoothScroll = (element: HTMLElement, behavior: "smooth" | "auto" = "smooth") => {
  if (typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ behavior, block: "nearest", inline: "nearest" });
  }
};

/**
 * Scroll to top with smooth behavior
 */
export const scrollToTop = (smooth = true) => {
  if (typeof window === "undefined") return;

  if (smooth) {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  } else {
    window.scrollTo(0, 0);
  }
};

/**
 * Get platform-specific scroll behavior
 * iOS Safari can have issues with smooth scroll
 */
export const getScrollBehavior = (): "smooth" | "auto" => {
  if (typeof window === "undefined") return "auto";

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);

  return isIOS && isSafari ? "auto" : "smooth";
};
