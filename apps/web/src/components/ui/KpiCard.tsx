type KpiCardProps = {
  title: string;
  value: string;
  trend: string;
};

export default function KpiCard({ title, value, trend }: KpiCardProps) {
  return (
    <div className="surface rounded-2xl p-4 sm:p-5">
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400 truncate">
        {title}
      </p>
      <div className="mt-2 sm:mt-3 flex items-end justify-between gap-2">
        <p className="text-xl sm:text-2xl font-semibold text-slate-900 truncate">{value}</p>
        <span className="text-xs sm:text-sm font-medium text-emerald-600 flex-shrink-0">{trend}</span>
      </div>
    </div>
  );
}
