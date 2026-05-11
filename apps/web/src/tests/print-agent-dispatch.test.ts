// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'

let emitAfterWrites = 2

class FakeSocket {
  private dataHandler: ((b: Buffer) => void) | null = null

  private writeCount = 0

  setTimeout(): this {
    return this
  }

  setNoDelay(): this {
    return this
  }

  destroy(): void {}

  once(event: string, handler: (...args: unknown[]) => void): this {
    if (event === 'data') {
      this.dataHandler = handler as (b: Buffer) => void
    }
    return this
  }

  on(event: string, handler: (...args: unknown[]) => void): this {
    if (event === 'connect') {
      queueMicrotask(() => handler())
    }
    return this
  }

  write(_chunk: Buffer, callback?: (error?: Error | null) => void): boolean {
    this.writeCount += 1
    callback?.(null)
    if (this.dataHandler && this.writeCount >= emitAfterWrites) {
      const handler = this.dataHandler
      this.dataHandler = null
      handler(Buffer.from([0x00]))
    }
    return true
  }
}

vi.mock('node:net', () => ({
  createConnection: () => new FakeSocket() as never
}))

describe('print agent dispatch', () => {
  it('dispatches ESC/POS job over tcp and reads status', async () => {
    emitAfterWrites = 2
    const { dispatchEscPosJob } = await import('../../../../apps/print-agent/src/dispatch')

    const result = await dispatchEscPosJob(
      {
        id: 'p1',
        name: 'Printer',
        modelProfile: 'generic_58mm_esc_pos',
        connection: 'tcp',
        tcpHost: '127.0.0.1',
        tcpPort: 9100,
        serialPath: null,
        baudRate: 9600
      },
      'ENTRY',
      {
        ticketId: 'tid-1',
        templateVersion: 'ticket-layout-v1',
        paperWidthMm: 58,
        ticketNumber: 'T-1',
        parkingName: 'Parkflow',
        plate: 'ABC123',
        vehicleType: 'CAR',
        site: null,
        lane: null,
        booth: null,
        terminal: null,
        operatorName: null,
        issuedAtIso: '2026-05-08T10:00:00Z',
        legalMessage: null,
        qrPayload: null,
        barcodePayload: null,
        copyNumber: 1,
        printerProfile: null,
        detailLines: null
      }
    )

    expect(result.bytesSent).toBeGreaterThan(0)
    expect(result.hardwareConfirmed).toBe(true)
    expect(result.statusByte).toBe(0x00)
    expect(result.statusHint).toBeNull()
  })

  it('reports health using the same tcp status path', async () => {
    emitAfterWrites = 1
    const { printerQuickHealth } = await import('../../../../apps/print-agent/src/dispatch')

    const health = await printerQuickHealth(
      {
        id: 'p1',
        name: 'Printer',
        modelProfile: 'generic_58mm_esc_pos',
        connection: 'tcp',
        tcpHost: '127.0.0.1',
        tcpPort: 9100,
        serialPath: null,
        baudRate: 9600
      },
      'generic_58mm_esc_pos'
    )

    expect(health).toMatchObject({
      online: true,
      hasPaper: true,
      lastError: null,
      statusByte: 0x00
    })
  })
})
