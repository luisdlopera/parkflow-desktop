"use client";

import { memo } from "react";
import type { CashAuditEntryDto } from "@/lib/cash/cash-api";

/**
 * Read-only audit trail summary for the current cash session. Depends only on
 * the audit entries and the `canAudit` flag, so React.memo prevents re-renders
 * driven by unrelated state (form keystrokes, summary refreshes, etc.).
 */
function CashAuditLogInner({
  auditLog,
  canAudit,
}: {
  auditLog: CashAuditEntryDto[];
  canAudit: boolean;
}) {
  if (auditLog.length === 0 || !canAudit) return null;

  return (
    <div className="mt-4 max-h-48 overflow-auto rounded-xl border border-default-200 bg-default-50 dark:bg-default-100 p-3 text-xs text-default-700">
      <p className="font-semibold text-foreground">Pista de auditoría (resumen)</p>
      <ul className="mt-2 space-y-1">
        {auditLog.slice(0, 40).map((a) => (
          <li key={a.id} className="border-b border-default-100 pb-1">
            <span className="text-default-500">{new Date(a.createdAt).toLocaleString()}</span>{" "}
            <strong>{a.action}</strong>
            {a.actorName ? ` · ${a.actorName}` : ""}
            {a.terminalId ? ` · terminal ${a.terminalId}` : ""}
            {a.reason ? ` — ${a.reason}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const CashAuditLog = memo(CashAuditLogInner);
