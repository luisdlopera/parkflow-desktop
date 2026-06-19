"use client";

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="h-12 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 last:border-0" />
        ))}
      </div>
    </div>
  );
}
