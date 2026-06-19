interface InlineErrorProps {
  message: string | null;
  className?: string;
}

export function InlineError({ message, className = "" }: InlineErrorProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={`rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 ${className}`}
    >
      {message}
    </div>
  );
}
