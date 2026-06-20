export interface KpiCardProps {
  title: string;
  value: string;
  trend?: string;
  trendValue?: number; // positive = up, negative = down
  trendLabel?: string; // "vs yesterday", "vs last week", etc.
  status?: "critical" | "warning" | "ok";
}

export default function KpiCard({
  title,
  value,
  trend,
  trendValue,
  trendLabel = "vs yesterday",
  status
}: KpiCardProps) {
  // Determine trend color and icon
  const getTrendColor = () => {
    if (trendValue === undefined) return "text-slate-500";
    if (trendValue > 0) return "text-emerald-600 dark:text-emerald-400";
    if (trendValue < 0) return "text-red-600 dark:text-red-400";
    return "text-slate-500";
  };

  const getTrendIcon = () => {
    if (trendValue === undefined) return "−";
    if (trendValue > 0) return "↑";
    if (trendValue < 0) return "↓";
    return "→";
  };

  const getStatusColor = () => {
    if (status === "critical") return "border-red-200 bg-red-50/30 dark:bg-red-950/20 dark:border-red-900/50";
    if (status === "warning") return "border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/50";
    return "border-slate-200 dark:border-slate-700";
  };

  return (
    <div className={`surface rounded-2xl p-4 sm:p-5 border transition-all hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 ${getStatusColor()}`}>
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400 truncate">
        {title}
      </p>
      <div className="mt-2 sm:mt-3 flex items-end justify-between gap-2">
        <p className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 truncate">{value}</p>
      </div>

      {/* Trend indicator */}
      {trendValue !== undefined && (
        <div className={`mt-2 flex items-center gap-1 text-xs sm:text-sm font-medium ${getTrendColor()}`}>
          <span className="text-base">{getTrendIcon()}</span>
          <span>{Math.abs(trendValue)}%</span>
          <span className="text-slate-400 text-xs">{trendLabel}</span>
        </div>
      )}

      {/* Fallback trend text */}
      {!trendValue && trend ? (
        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">{trend}</p>
      ) : null}
    </div>
  );
}
