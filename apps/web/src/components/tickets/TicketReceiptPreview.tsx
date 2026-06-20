"use client";

import type { TicketPaperWidthMm } from "@parkflow/types";
import { lineWidthChars } from "@parkflow/types";

type Props = {
  lines: string[];
  paperWidthMm: TicketPaperWidthMm;
  title?: string;
};

export default function TicketReceiptPreview({ lines, paperWidthMm, title = "Vista previa del tiquete" }: Props) {
  const ch = lineWidthChars(paperWidthMm);
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4 overflow-x-auto">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <pre
        className="mt-2 whitespace-pre text-xs leading-relaxed text-slate-900 dark:text-slate-100"
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          width: `${ch}ch`,
          maxWidth: "100%",
          minWidth: "min(100%, 32ch)"
        }}
      >
        {lines.join("\n")}
      </pre>
    </div>
  );
}
