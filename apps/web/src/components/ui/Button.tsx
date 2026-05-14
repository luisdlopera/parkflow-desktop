type ButtonProps = {
  label: string;
  tone?: "primary" | "ghost";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  [key: string]: unknown;
};

const toneStyles = {
  primary: "bg-brand-500 text-white hover:bg-brand-600",
  ghost: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
};

export default function Button({
  label,
  tone = "primary",
  type = "button",
  disabled = false,
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      {...rest}
      className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${toneStyles[tone]}`}
    >
      {label}
    </button>
  );
}
