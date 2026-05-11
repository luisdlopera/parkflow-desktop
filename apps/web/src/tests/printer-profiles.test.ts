import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRINTER_PROFILE,
  PrinterProfile,
  isTicketPrinterProfile,
  parsePrinterProfile,
  resolvePrinterProfile
} from '@parkflow/types'

describe('printer profiles', () => {
  it('parses canonical values and aliases', () => {
    expect(parsePrinterProfile('epson_tm_t20iii')).toBe(PrinterProfile.EpsonTmT20Iii)
    expect(parsePrinterProfile('generic-58mm')).toBe(PrinterProfile.Generic58mmEscPos)
    expect(isTicketPrinterProfile(PrinterProfile.BixolonSrp332Ii)).toBe(true)
    expect(isTicketPrinterProfile('unknown')).toBe(false)
  })

  it('resolves to default unless strict mode is enabled', () => {
    expect(resolvePrinterProfile('')).toBe(DEFAULT_PRINTER_PROFILE)
    expect(() => resolvePrinterProfile('bad', { strict: true })).toThrow('Unknown printer profile')
  })
})
