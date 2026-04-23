import * as fs from "node:fs";
import * as path from "node:path";

export type AuditEntry = {
  atIso: string;
  event: "print" | "test_print" | "auth_fail" | "origin_reject";
  jobId: string;
  idempotencyKey: string;
  ticketId: string;
  documentType: string;
  terminalId: string | null;
  operatorUserId: string | null;
  clientOrigin: string | null;
  ok: boolean;
  message?: string;
};

export function appendAudit(auditFile: string, entry: AuditEntry): void {
  const dir = path.dirname(auditFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(auditFile, `${JSON.stringify(entry)}\n`, "utf8");
}
