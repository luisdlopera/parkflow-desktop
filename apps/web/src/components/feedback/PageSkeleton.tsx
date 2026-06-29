"use client";

import { AnimatedSkeletonLoader } from "@/components/animations/AnimatedSkeletonLoader";

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Title skeleton */}
      <AnimatedSkeletonLoader count={1} height="h-8" className="w-48" />

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatedSkeletonLoader count={3} height="h-24" variant="card" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-default-200 dark:border-default-700 overflow-hidden">
        <div className="h-12 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b border-default-200 dark:border-default-700 animate-shimmer" />
        <AnimatedSkeletonLoader count={5} height="h-14" variant="table" />
      </div>
    </div>
  );
}
