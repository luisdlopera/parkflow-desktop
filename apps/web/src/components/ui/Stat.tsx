interface StatProps {
  label: string;
  value: string | number | undefined;
  className?: string;
}

export function Stat({ label, value, className = "" }: StatProps) {
  return (
    <div className={`rounded-2xl border border-default-200 dark:border-default-700 bg-default-50 dark:bg-default-100 dark:bg-default-900 px-4 py-3 ${className}`}>
      <p className="text-xs uppercase tracking-wider text-default-500 dark:text-default-400">{label}</p>
      <p className="text-2xl font-bold text-foreground dark:text-default-200">{value ?? "—"}</p>
    </div>
  );
}
