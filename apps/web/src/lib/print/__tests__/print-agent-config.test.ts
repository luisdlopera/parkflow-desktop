// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

describe('print agent config', () => {
  it('loads printers from a file and parses runtime defaults', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pf-config-'))
    const file = join(dir, 'printers.json')
    writeFileSync(
      file,
      JSON.stringify([
        {
          id: 'p1',
          name: 'Front Desk',
          modelProfile: 'generic_58mm_esc_pos',
          connection: 'tcp',
          tcpHost: '10.0.0.2',
          tcpPort: 9100,
          serialPath: null,
          baudRate: 9600
        }
      ]),
      'utf8'
    )

    vi.stubEnv('PARKFLOW_PRINTERS_FILE', 'printers.json')
    vi.stubEnv('PRINT_AGENT_PORT', '9329')
    vi.stubEnv('PRINT_AGENT_ALLOWED_ORIGINS', 'http://a.local, http://b.local')
    vi.stubEnv('PRINT_AGENT_DATA_DIR', 'custom-data')
    vi.stubEnv('PRINT_AGENT_AUDIT_LOG', 'custom-audit.jsonl')

    const mod = await import('../../../../apps/print-agent/src/config')
    expect(mod.loadPrintersFromEnv(dir)).toEqual([
      {
        id: 'p1',
        name: 'Front Desk',
        modelProfile: 'generic_58mm_esc_pos',
        connection: 'tcp',
        tcpHost: '10.0.0.2',
        tcpPort: 9100,
        serialPath: null,
        baudRate: 9600
      }
    ])
    expect(mod.agentPort).toBe(9329)
    expect(mod.allowedOrigins).toEqual(['http://a.local', 'http://b.local'])
    expect(mod.dataDir).toBe('custom-data')
    expect(mod.auditPath).toBe('custom-audit.jsonl')

    rmSync(dir, { recursive: true, force: true })
  })

  it('falls back to default printer config when no file is present', async () => {
    const mod = await import('../../../../apps/print-agent/src/config')
    const printers = mod.loadPrintersFromEnv(process.cwd())

    expect(printers).toHaveLength(1)
    expect(printers[0]?.id).toBe('default')
    expect(printers[0]?.connection).toBe('tcp')
  })
})
