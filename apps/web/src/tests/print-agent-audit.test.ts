// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

afterEach(() => {
  vi.clearAllMocks()
})

describe('print agent audit', () => {
  it('creates the audit directory and appends jsonl rows', async () => {
    const { appendAudit } = await import('../../../../apps/print-agent/src/audit')
    const dir = mkdtempSync(join(tmpdir(), 'pf-audit-'))
    const auditFile = join(dir, 'nested', 'audit.log.jsonl')

    appendAudit(auditFile, {
      atIso: '2026-05-08T10:00:00Z',
      event: 'print',
      jobId: 'job-1',
      idempotencyKey: 'key-1',
      ticketId: 'ticket-1',
      documentType: 'ENTRY',
      terminalId: 'TERM-1',
      operatorUserId: 'operator-1',
      clientOrigin: 'http://localhost',
      ok: true,
      message: 'done'
    })

    expect(statSync(join(dir, 'nested')).isDirectory()).toBe(true)
    expect(readFileSync(auditFile, 'utf8').trim()).toBe(
      JSON.stringify({
        atIso: '2026-05-08T10:00:00Z',
        event: 'print',
        jobId: 'job-1',
        idempotencyKey: 'key-1',
        ticketId: 'ticket-1',
        documentType: 'ENTRY',
        terminalId: 'TERM-1',
        operatorUserId: 'operator-1',
        clientOrigin: 'http://localhost',
        ok: true,
        message: 'done'
      })
    )

    rmSync(dir, { recursive: true, force: true })
  })
})
