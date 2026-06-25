import { describe, expect, it } from 'vitest'
import {
  buildTicketPreviewLines,
  formatDateNatural,
  formatTimeNatural,
  lineWidthChars,
  ticketTitleForDocument,
  vehicleTypeLabel
} from '@parkflow/types'

describe('ticket layout', () => {
  it('maps document kinds to titles and widths', () => {
    expect(lineWidthChars(58)).toBe(32)
    expect(lineWidthChars(80)).toBe(48)
    expect(ticketTitleForDocument('ENTRY')).toBe('ENTRADA')
    expect(ticketTitleForDocument('CASH_CLOSING')).toBe('CIERRE DE CAJA')
  })

  it('formats date and time in natural language', () => {
    const date = formatDateNatural('2026-05-08T10:00:00Z')
    const time = formatTimeNatural('2026-05-08T10:00:00Z')
    expect(date.toLowerCase()).toContain('8 de mayo')
    expect(date.toLowerCase()).toContain('2026')
    expect(time).toMatch(/10:00/)
    expect(time.toUpperCase()).toContain('M')
  })

  it('maps vehicle types to friendly labels', () => {
    expect(vehicleTypeLabel('CAR')).toBe('Carro')
    expect(vehicleTypeLabel('MOTORCYCLE')).toBe('Moto')
    expect(vehicleTypeLabel('BICYCLE')).toBe('Bicicleta')
  })

  it('builds preview lines with optional sections and natural language', () => {
    const lines = buildTicketPreviewLines({
      documentKind: 'ENTRY',
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
      detailLines: ['Detail A', 'Detail B'],
      price: '$15,000',
      vehicleType: 'CAR'
    })

    // Verify human-friendly labels exist
    expect(lines.some(l => l.includes('Numero:'))).toBe(true)
    expect(lines.some(l => l.includes('Atendido por:'))).toBe(true)
    expect(lines.some(l => l.includes('Vehiculo:'))).toBe(true)
    expect(lines.some(l => l.includes('Carro'))).toBe(true)
    expect(lines.some(l => l.includes('TOTAL A PAGAR'))).toBe(true)
    expect(lines.some(l => l.includes('$15,000'))).toBe(true)

    // Verify natural date and time
    expect(lines.some(l => l.includes('FECHA'))).toBe(true)
    expect(lines.some(l => l.includes('HORA'))).toBe(true)

    // Verify QR section
    expect(lines.some(l => l.includes('ESCANEA PARA SALIR'))).toBe(true)
    expect(lines.some(l => l.includes('[CODIGO QR]'))).toBe(true)

    expect(lines).toContain('Line 1')
    expect(lines).toContain('Detail B')
    expect(lines.at(-1)).toBe('--- corte ---')
  })
})
