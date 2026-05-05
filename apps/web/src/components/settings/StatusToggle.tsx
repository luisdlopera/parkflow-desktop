"use client";

import { useState } from "react";

type StatusToggleProps = {
  active: boolean;
  onChange: (active: boolean) => void | Promise<void>;
  disabled?: boolean;
  confirmMessage?: string;
};

export function StatusToggle({ active, onChange, disabled, confirmMessage }: StatusToggleProps) {
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (disabled || pending) return;
    const next = !active;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setPending(true);
    try {
      await onChange(next);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        active ? "bg-emerald-500" : "bg-slate-300"
      } ${disabled || pending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      aria-pressed={active}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          active ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
