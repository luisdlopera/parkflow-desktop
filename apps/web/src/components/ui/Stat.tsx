interface StatProps {
  label: string;
  value: string | number | undefined;
  className?: string;
}

export function Stat({ label, value, className = "" }: StatProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 ${className}`}>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value ?? "—"}</p>
    </div>
  );
}
