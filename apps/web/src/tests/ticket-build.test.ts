import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildTicketDocument, resolvePaperWidthMmFromEnv, resolvePrinterProfileFromEnv, ticketDocumentToJson } from '@/lib/print/ticket-build'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('ticket build', () => {
  it('uses env-driven defaults and runtime options', () => {
    vi.stubEnv('NEXT_PUBLIC_PRINTER_PAPER_MM', '80')
    vi.stubEnv('NEXT_PUBLIC_PARKING_NAME', 'Central Parking')
    vi.stubEnv('NEXT_PUBLIC_TICKET_LEGAL_MESSAGE', 'Legal line')
    vi.stubEnv('NEXT_PUBLIC_TICKET_QR_PREFIX', 'QRPREFIX')
    vi.stubEnv('NEXT_PUBLIC_PRINTER_PROFILE', 'xprinter_80_generic_esc_pos')

    expect(resolvePaperWidthMmFromEnv()).toBe(80)
    expect(resolvePrinterProfileFromEnv()).toBe('xprinter_80_generic_esc_pos')

    const ticket = buildTicketDocument(
      {
        sessionId: 'session-1',
        receipt: {
          ticketNumber: 'T-1',
          plate: 'ABC123',
          vehicleType: 'CAR',
          site: 'HQ',
          lane: 'L1',
          booth: 'B1',
          terminal: 'TERM-1',
          entryAt: '2026-05-08T10:00:00Z'
        }
      },
      { operatorName: 'Alice' }
    )

    expect(ticket.paperWidthMm).toBe(80)
    expect(ticket.parkingName).toBe('Central Parking')
    expect(ticket.legalMessage).toBe('Legal line')
    expect(ticket.qrPayload).toBe('QRPREFIX:T-1')
    expect(ticket.operatorName).toBe('Alice')
    expect(JSON.parse(ticketDocumentToJson(ticket)).ticketNumber).toBe('T-1')
  })
})
