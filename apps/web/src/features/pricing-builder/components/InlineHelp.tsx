"use client";

import { useId, useState } from "react";
import { CircleHelp } from "lucide-react";

export function InlineHelp({ title, children }: { title?: string; children: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label="Mostrar explicación"
        title="Mostrar explicación"
        onClick={() => setOpen((value) => !value)}
        className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded text-default-400 hover:text-default-700 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      {open ? (
        <span
          id={id}
          role="status"
          className="absolute left-0 top-8 z-30 w-72 rounded-lg border border-default-300 bg-white/95 p-3 text-left text-xs leading-5 text-default-700 ring-1 ring-black/5 backdrop-blur-sm dark:bg-zinc-950/95 dark:text-default-200 dark:ring-white/10"
        >
          {title ? <span className="mb-1 block font-semibold text-foreground">{title}</span> : null}
          {children}
        </span>
      ) : null}
    </span>
  );
}
