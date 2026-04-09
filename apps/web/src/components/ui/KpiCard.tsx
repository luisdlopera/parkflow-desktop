type KpiCardProps = {
  title: string;
  value: string;
  trend: string;
};

export default function KpiCard({ title, value, trend }: KpiCardProps) {
  return (
    <div className="surface rounded-2xl p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <div className="mt-3 flex items-end justify-between">
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <span className="text-sm font-medium text-emerald-600">{trend}</span>
      </div>
    </div>
  );
}
