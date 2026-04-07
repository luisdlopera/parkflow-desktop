type ButtonProps = {
  label: string;
  tone?: "primary" | "ghost";
};

const toneStyles = {
  primary: "bg-brand-500 text-white hover:bg-brand-600",
  ghost: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
};

export default function Button({ label, tone = "primary" }: ButtonProps) {
  return (
    <button
      type="button"
      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${toneStyles[tone]}`}
    >
      {label}
    </button>
  );
}
