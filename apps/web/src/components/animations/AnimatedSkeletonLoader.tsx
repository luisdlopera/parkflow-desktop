"use client";

import { motion } from "framer-motion";

interface AnimatedSkeletonLoaderProps {
  count?: number;
  height?: string;
  className?: string;
  variant?: "card" | "table" | "line";
}

/**
 * AnimatedSkeletonLoader with shimmer effect
 * Professional loading state with gradient shimmer animation
 */
export function AnimatedSkeletonLoader({
  count = 1,
  height = "h-12",
  className = "",
  variant = "line",
}: AnimatedSkeletonLoaderProps) {
  if (variant === "card") {
    return (
      <motion.div
        className={`space-y-4 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            <div className="h-32 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 animate-shimmer" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded animate-shimmer" />
              <div className="h-4 w-3/4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded animate-shimmer" />
            </div>
          </div>
        ))}
      </motion.div>
    );
  }

  if (variant === "table") {
    return (
      <motion.div
        className={`space-y-2 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {[...Array(count)].map((_, i) => (
          <div key={i} className="flex gap-4 p-3">
            <div className="h-10 w-10 rounded bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 animate-shimmer flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded animate-shimmer" />
              <div className="h-3 w-2/3 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded animate-shimmer" />
            </div>
            <div className="h-4 w-16 bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded animate-shimmer" />
          </div>
        ))}
      </motion.div>
    );
  }

  // default "line" variant
  return (
    <motion.div
      className={`space-y-3 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`${height} bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg animate-shimmer`}
        />
      ))}
    </motion.div>
  );
}
