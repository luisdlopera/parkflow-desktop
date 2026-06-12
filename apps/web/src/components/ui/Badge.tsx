type BadgeProps = {
  label: string;
  tone?: "success" | "warning" | "neutral";
  [key: string]: unknown;
};

const toneStyles = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
};

export default function Badge({ label, tone = "neutral", ...rest }: BadgeProps) {
  return (
    <span {...rest} className={`rounded-full px-3 py-1 text-xs font-semibold ${toneStyles[tone]}`}>
      {label}
    </span>
  );
}
