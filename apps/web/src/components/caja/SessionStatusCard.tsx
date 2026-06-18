"use client";
import React from "react";
import Badge from "@/components/ui/Badge";
import { CashSummaryTotals } from "@/app/(dashboard)/caja/CashSummaryTotals";
import { CashAuditLog } from "@/app/(dashboard)/caja/CashAuditLog";
import StepProgress from "@/components/caja/StepProgress";

export default function SessionStatusCard({ p }: any) {
  return (
    <div className="mt-4 space-y-4 text-sm">
      <div className="flex items-center gap-2">
        <Badge
          data-testid="cash-status"
          label={p.session?.status === "OPEN" ? "Caja abierta" : "Caja cerrada"}
          tone={p.session?.status === "OPEN" ? "success" : "neutral"}
        />
        <span className="text-slate-600">
          {new Date(p.session!.openedAt).toLocaleString()}
          {p.session?.operatorName ? <> — {p.session.operatorName}</> : null}
        </span>
      </div>
      {p.isOpen && <StepProgress stepsState={[
        { label: "Abrir", done: true },
        { label: "Movimientos", done: p.allMovements.length > 0 },
        { label: "Arqueo", done: !!p.session?.countedAt },
        { label: "Cerrar", done: false },
      ]} session={p.session} />}
      {p.summary && <CashSummaryTotals summary={p.summary} />}
      {p.session?.notes ? (
        <p className="mt-2 rounded-lg bg-amber-50/50 px-3 py-2 text-slate-800 italic">&quot;{p.session.notes}&quot;</p>
      ) : null}
      <CashAuditLog auditLog={p.auditLog} canAudit={p.perms.canAudit} />
    </div>
  );
}
