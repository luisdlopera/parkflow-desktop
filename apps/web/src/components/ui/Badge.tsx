type BadgeProps = {
  label: string;
  tone?: "success" | "warning" | "neutral";
  [key: string]: unknown;
};

const toneStyles = {
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  neutral: "bg-slate-100 text-slate-700"
};

export default function Badge({ label, tone = "neutral", ...rest }: BadgeProps) {
  return (
    <span {...rest} className={`rounded-full px-3 py-1 text-xs font-semibold ${toneStyles[tone]}`}>
      {label}
    </span>
  );
}
