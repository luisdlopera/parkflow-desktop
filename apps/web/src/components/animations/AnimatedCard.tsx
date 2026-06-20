"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cardHoverVariants, cardBorderVariants } from "@/lib/animations/variants";
import { prefersReducedMotion } from "@/lib/animations/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

/**
 * AnimatedCard with subtle hover lift and border transition
 * Professional card component with smooth interactions
 */
export function AnimatedCard({
  children,
  className = "",
  hoverable = true,
  onClick,
}: AnimatedCardProps) {
  const reducedMotion = prefersReducedMotion();

  return (
    <motion.div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition-smooth ${className}`}
      variants={cardHoverVariants}
      whileHover={hoverable && !reducedMotion ? "hover" : {}}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedCardGroupProps {
  children: ReactNode;
  className?: string;
}

/**
 * AnimatedCardGroup for rendering multiple animated cards
 * Cards animate in with stagger effect
 */
export function AnimatedCardGroup({ children, className }: AnimatedCardGroupProps) {
  return (
    <motion.div
      className={`grid gap-4 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
