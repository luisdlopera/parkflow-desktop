import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { appendAudit, type AuditEntry } from "../audit.js";

describe("appendAudit", () => {
  let tmpDir: string;
  let auditFile: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "print-agent-audit-"));
    auditFile = path.join(tmpDir, "audit.log.jsonl");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("appends a JSON line to the audit file", () => {
    const entry: AuditEntry = {
      atIso: "2026-06-26T00:00:00.000Z",
      event: "print",
      jobId: "job-1",
      idempotencyKey: "key-1",
      ticketId: "ticket-1",
      documentType: "ENTRY",
      terminalId: null,
      operatorUserId: null,
      clientOrigin: "http://localhost:6001",
      ok: true,
      message: "OK",
    };
    appendAudit(auditFile, entry);
    const content = fs.readFileSync(auditFile, "utf8").trim();
    const parsed = JSON.parse(content);
    expect(parsed.jobId).toBe("job-1");
    expect(parsed.event).toBe("print");
    expect(parsed.ok).toBe(true);
  });

  it("appends multiple entries as separate lines", () => {
    appendAudit(auditFile, {
      atIso: "1", event: "print", jobId: "1", idempotencyKey: "k1",
      ticketId: "t1", documentType: "ENTRY", terminalId: null,
      operatorUserId: null, clientOrigin: null, ok: true,
    });
    appendAudit(auditFile, {
      atIso: "2", event: "auth_fail", jobId: "2", idempotencyKey: "k2",
      ticketId: "t2", documentType: "ENTRY", terminalId: null,
      operatorUserId: null, clientOrigin: null, ok: false,
      message: "invalid api key",
    });
    const lines = fs.readFileSync(auditFile, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).event).toBe("print");
    expect(JSON.parse(lines[1]!).event).toBe("auth_fail");
  });

  it("creates directory if it does not exist", () => {
    const nestedFile = path.join(tmpDir, "sub", "nested", "audit.log.jsonl");
    appendAudit(nestedFile, {
      atIso: "1", event: "print", jobId: "1", idempotencyKey: "k1",
      ticketId: "t1", documentType: "ENTRY", terminalId: null,
      operatorUserId: null, clientOrigin: null, ok: true,
    });
    expect(fs.existsSync(nestedFile)).toBe(true);
  });

  it("writes all required fields in JSON line", () => {
    appendAudit(auditFile, {
      atIso: "2026-01-01T00:00:00Z",
      event: "test_print",
      jobId: "j1",
      idempotencyKey: "ik1",
      ticketId: "tk1",
      documentType: "EXIT",
      terminalId: "term-1",
      operatorUserId: "op-1",
      clientOrigin: "http://localhost",
      ok: true,
    });
    const parsed = JSON.parse(fs.readFileSync(auditFile, "utf8"));
    expect(parsed.atIso).toBeDefined();
    expect(parsed.event).toBeDefined();
    expect(parsed.jobId).toBeDefined();
    expect(parsed.idempotencyKey).toBeDefined();
    expect(parsed.ticketId).toBeDefined();
    expect(parsed.documentType).toBeDefined();
    expect(parsed.terminalId).toBe("term-1");
    expect(parsed.operatorUserId).toBe("op-1");
    expect(parsed.clientOrigin).toBe("http://localhost");
    expect(parsed.ok).toBe(true);
  });
});
