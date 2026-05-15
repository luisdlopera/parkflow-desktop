"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

interface QuestionHelpProps {
  children: React.ReactNode;
  title?: string;
  id?: string;
}

export default function QuestionHelp({ children, title = "Explicación", id }: QuestionHelpProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onDoc);
    return () => document.removeEventListener("keydown", onDoc);
  }, [open]);

  // Close when clicking outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const panelId = id ?? `help-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Mostrar explicación`}
        title="Mostrar explicación"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded text-default-400 hover:text-default-700 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div
          id={panelId}
          className="z-50 absolute left-0 top-full mt-2 w-[260px] max-w-[calc(100vw-32px)] bg-white dark:bg-neutral-900 border border-default-200 dark:border-neutral-800 rounded shadow-lg p-3 text-sm text-default-700 dark:text-neutral-200"
          aria-hidden={!open}
        >
          <strong className="block text-xs text-default-500 mb-1">{title}</strong>
          <div>{children}</div>
        </div>
      )}
    </div>
  );
}
