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
    <div className="mt-4 rounded-2xl border border-default-200 dark:border-default-700 bg-default-50 dark:bg-default-900 p-4 overflow-x-auto">
      <p className="text-xs font-medium uppercase tracking-wide text-default-500 dark:text-default-400">{title}</p>
      <pre
        className="mt-2 whitespace-pre text-xs leading-relaxed text-foreground dark:text-default-200"
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
