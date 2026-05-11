import { describe, expect, it } from 'vitest'
import { buildEscPosReceiptBytes, resolveEscPosProfile } from '@parkflow/print-core'

describe('print core', () => {
  it('resolves ESC/POS profile hints', () => {
    const profile = resolveEscPosProfile('generic_58mm_esc_pos')

    expect(profile.statusHintGsR1(0x20)).toBe('paper_end_detected')
    expect(profile.statusHintGsR1(0x04)).toBe('paper_near_end_detected')
    expect(profile.hardwareReadyAfterPrint(null)).toBe(false)
    expect(profile.hardwareReadyAfterPrint(0x00)).toBe(true)
  })

  it('builds ESC/POS receipt bytes with cut command', () => {
    const bytes = buildEscPosReceiptBytes(
      'ENTRY',
      {
        ticketId: 'tid-1',
        templateVersion: 'ticket-layout-v1',
        paperWidthMm: 58,
        ticketNumber: 'T-1',
        parkingName: 'Parkflow',
        plate: 'ABC123',
        vehicleType: 'CAR',
        site: 'HQ',
        lane: 'L1',
        booth: 'B1',
        terminal: 'TERM-1',
        operatorName: 'Operator',
        issuedAtIso: '2026-05-08T10:00:00Z',
        legalMessage: null,
        qrPayload: 'QR:1',
        barcodePayload: null,
        copyNumber: 1,
        printerProfile: null,
        detailLines: ['extra line']
      },
      resolveEscPosProfile('generic_58mm_esc_pos')
    )

    expect(Buffer.from(bytes).toString('latin1')).toContain('T-1')
    expect(Buffer.from(bytes).toString('latin1')).toContain('ABC123')
    expect(Array.from(bytes.slice(-3))).toEqual([0x1d, 0x56, 0x00])
  })
})
