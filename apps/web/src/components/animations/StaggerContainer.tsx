"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { containerVariants, itemVariants } from "@/lib/animations/variants";
import { prefersReducedMotion } from "@/lib/animations/utils";

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

/**
 * StaggerContainer for animating lists and grids
 * Children automatically animate in staggered sequence
 * Use with motion.div children for best results
 */
export function StaggerContainer({
  children,
  className,
  delay = 0,
  staggerDelay = 0.1,
}: StaggerContainerProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className={className}
      transition={
        reducedMotion
          ? { duration: 0.01, staggerChildren: 0 }
          : {
              staggerChildren: staggerDelay,
              delayChildren: delay,
            }
      }
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

/**
 * StaggerItem - child component for StaggerContainer
 * Automatically inherits stagger animation from parent
 */
export function StaggerItem({ children, className }: StaggerItemProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      variants={itemVariants}
      className={className}
      transition={
        reducedMotion
          ? { duration: 0.01 }
          : {
              duration: 0.3,
            }
      }
    >
      {children}
    </motion.div>
  );
}
