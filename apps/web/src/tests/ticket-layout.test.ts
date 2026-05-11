import { describe, expect, it } from 'vitest'
import {
  buildTicketPreviewLines,
  lineWidthChars,
  ticketTitleForDocument
} from '@parkflow/types'

describe('ticket layout', () => {
  it('maps document kinds to titles and widths', () => {
    expect(lineWidthChars(58)).toBe(32)
    expect(lineWidthChars(80)).toBe(48)
    expect(ticketTitleForDocument('ENTRY')).toBe('ENTRADA')
    expect(ticketTitleForDocument('CASH_CLOSING')).toBe('CIERRE DE CAJA')
  })

  it('builds preview lines with optional sections', () => {
    const lines = buildTicketPreviewLines({
      documentKind: 'REPRINT',
      paperWidthMm: 58,
      ticketNumber: 'T-100',
      parkingName: 'Parkflow',
      plate: 'ABC123',
      ticketId: 'tid-1',
      templateVersion: 'ticket-layout-v1',
      issuedAtIso: '2026-05-08T10:00:00Z',
      operatorName: 'Operator',
      site: 'HQ',
      lane: 'L1',
      booth: 'B1',
      terminal: 'TERM-1',
      copyNumber: 2,
      legalMessage: 'Line 1\nLine 2',
      qrPayload: 'QR:100',
      barcodePayload: null,
      detailLines: ['Detail A', 'Detail B']
    })

    expect(lines).toContain('[QR] QR:100')
    expect(lines).toContain('Line 1')
    expect(lines).toContain('Detail B')
    expect(lines.at(-1)).toBe('--- corte ---')
  })
})
