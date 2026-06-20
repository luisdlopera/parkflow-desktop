"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { pageTransitionVariants } from "@/lib/animations/variants";
import { prefersReducedMotion } from "@/lib/animations/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition wrapper for page-level animations
 * Provides fade-in + subtle scale on page enter
 * Respects prefers-reduced-motion for accessibility
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      transition={
        reducedMotion
          ? { duration: 0.01 }
          : {
              duration: 0.3,
              ease: "easeOut",
            }
      }
    >
      {children}
    </motion.div>
  );
}
