/**
 * Framer Motion Variants for Professional Animations
 * Centralized animation definitions for consistent, snappy feel
 * Durations: 200-300ms for fast, premium feel
 */

import { Variants } from "framer-motion";

export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const slideInFromLeftVariants: Variants = {
  initial: { x: -20, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { x: -20, opacity: 0, transition: { duration: 0.2 } },
};

export const slideInFromRightVariants: Variants = {
  initial: { x: 20, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { x: 20, opacity: 0, transition: { duration: 0.2 } },
};

export const slideInFromTopVariants: Variants = {
  initial: { y: -20, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { y: -20, opacity: 0, transition: { duration: 0.2 } },
};

export const slideInFromBottomVariants: Variants = {
  initial: { y: 20, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { y: 20, opacity: 0, transition: { duration: 0.2 } },
};

export const scaleInVariants: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { scale: 0.95, opacity: 0, transition: { duration: 0.2 } },
};

export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContentVariants: Variants = {
  initial: { y: 20, opacity: 0, scale: 0.95 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }, // spring-like bounce
  },
  exit: {
    y: 20,
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const drawerVariants: Variants = {
  initial: { x: "100%", opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { x: "100%", opacity: 0, transition: { duration: 0.25, ease: "easeIn" } },
};

export const toastVariants: Variants = {
  initial: { y: -20, opacity: 0, x: 20 },
  animate: {
    y: 0,
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    y: -20,
    opacity: 0,
    x: 20,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const dropdownVariants: Variants = {
  initial: { y: -10, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: { y: -10, opacity: 0, transition: { duration: 0.15 } },
};

export const containerVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0,
    },
  },
};

export const itemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

export const shimmerVariants: Variants = {
  animate: {
    backgroundPosition: ["200% center", "-200% center"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

export const spinVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Button animations
export const buttonHoverVariants: Variants = {
  hover: { scale: 1.02, transition: { duration: 0.2 } },
  tap: { scale: 0.98 },
};

export const buttonPulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatType: "loop" as const,
    },
  },
};

// Card animations
export const cardHoverVariants: Variants = {
  initial: { y: 0 },
  hover: {
    y: -4,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

export const cardBorderVariants: Variants = {
  initial: { borderColor: "rgb(229, 229, 224)" }, // border-default from theme
  hover: {
    borderColor: "rgb(217, 119, 87)", // brand-500
    transition: { duration: 0.3 },
  },
};

// Input animations
export const inputFocusVariants: Variants = {
  focused: {
    borderColor: "rgb(217, 119, 87)", // brand-500
    boxShadow: "0 0 0 3px rgba(217, 119, 87, 0.08)",
    transition: { duration: 0.2 },
  },
};

// Table row animations
export const tableRowVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

export const tableRowHoverVariants: Variants = {
  hover: {
    backgroundColor: "rgb(245, 245, 242)", // surface-tertiary
    transition: { duration: 0.15 },
  },
};

// Badge/Status pulse animations
export const statusPulseVariants: Variants = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: "loop" as const,
    },
  },
};

// Skeleton animation
export const skeletonVariants: Variants = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Success checkmark animation
export const successCheckmarkVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      duration: 0.4,
    },
  },
};

// Error shake animation
export const shakeVariants: Variants = {
  animate: {
    x: [-5, 5, -5, 5, 0],
    transition: {
      duration: 0.4,
      ease: "easeInOut",
    },
  },
};
