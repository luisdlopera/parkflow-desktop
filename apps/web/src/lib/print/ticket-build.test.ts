import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolvePaperWidthMmFromEnv,
  resolvePrinterProfileFromEnv,
  buildTicketDocument,
  ticketDocumentToJson,
  type OperationPayload
} from './ticket-build';

describe('print/ticket-build', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('resolvePaperWidthMmFromEnv()', () => {
    it.each([
      {
        label: 'returns 58 as default when not set',
        envValue: undefined,
        expected: 58
      },
      {
        label: 'returns 58 when set to 58',
        envValue: '58',
        expected: 58
      },
      {
        label: 'returns 80 when set to 80',
        envValue: '80',
        expected: 80
      },
      {
        label: 'returns 58 when set to value less than 80',
        envValue: '79',
        expected: 58
      },
      {
        label: 'returns 80 when set to value >= 80',
        envValue: '100',
        expected: 80
      },
      {
        label: 'returns 58 when set to 0',
        envValue: '0',
        expected: 58
      },
      {
        label: 'returns 80 when set to 80.5',
        envValue: '80.5',
        expected: 80
      },
      {
        label: 'returns 58 when set to invalid value',
        envValue: 'invalid',
        expected: 58
      },
      {
        label: 'returns 58 when set to negative value',
        envValue: '-10',
        expected: 58
      },
      {
        label: 'returns 58 when set to 57',
        envValue: '57',
        expected: 58
      },
      {
        label: 'returns 80 when set to 85',
        envValue: '85',
        expected: 80
      }
    ])('$label', ({ envValue, expected }) => {
      if (envValue === undefined) {
        delete process.env.NEXT_PUBLIC_PRINTER_PAPER_MM;
      } else {
        process.env.NEXT_PUBLIC_PRINTER_PAPER_MM = envValue;
      }

      const result = resolvePaperWidthMmFromEnv();

      expect(result).toBe(expected);
    });
  });

  describe('resolvePrinterProfileFromEnv()', () => {
    it('returns a valid printer profile', () => {
      process.env.NEXT_PUBLIC_PRINTER_PROFILE = 'generic_58mm_esc_pos';
      const result = resolvePrinterProfileFromEnv();

      expect(result).toBeDefined();
    });

    it('passes strict mode option when enabled', () => {
      process.env.NEXT_PUBLIC_PRINTER_PROFILE = 'generic_58mm_esc_pos';
      process.env.NEXT_PUBLIC_PRINTER_STRICT_MODE = 'true';

      const result = resolvePrinterProfileFromEnv();

      expect(result).toBeDefined();
    });

    it('disables strict mode by default', () => {
      process.env.NEXT_PUBLIC_PRINTER_PROFILE = 'xprinter_80_generic_esc_pos';
      delete process.env.NEXT_PUBLIC_PRINTER_STRICT_MODE;

      const result = resolvePrinterProfileFromEnv();

      expect(result).toBeDefined();
    });

    it.each([
      { profile: 'generic_58mm_esc_pos', strictMode: 'true' },
      { profile: 'xprinter_80_generic_esc_pos', strictMode: 'true' },
      { profile: 'epson_tm_t20iii', strictMode: 'false' },
      { profile: 'bixolon_srp330iii', strictMode: 'false' }
    ])('handles printer profile: $profile with strict=$strictMode', ({ profile, strictMode }) => {
      process.env.NEXT_PUBLIC_PRINTER_PROFILE = profile;
      process.env.NEXT_PUBLIC_PRINTER_STRICT_MODE = strictMode;

      const result = resolvePrinterProfileFromEnv();
      expect(result).toBeDefined();
    });
  });

  describe('buildTicketDocument()', () => {
    const createPayload = (overrides?: Partial<OperationPayload>): OperationPayload => ({
      sessionId: 'session-123',
      receipt: {
        ticketNumber: 'TK001',
        plate: 'ABC1234',
        vehicleType: 'CAR',
        site: 'Site A',
        lane: '1',
        booth: 'A1',
        terminal: 'Terminal 1',
        parkingSpaceCode: 'P-001',
        entryAt: '2024-01-15T10:30:00Z'
      },
      ...overrides
    });

    it.each([
      {
        label: 'builds ticket document with all fields',
        payload: createPayload(),
        validator: (doc: any) => {
          expect(doc.ticketId).toBe('session-123');
          expect(doc.ticketNumber).toBe('TK001');
          expect(doc.plate).toBe('ABC1234');
          expect(doc.vehicleType).toBe('CAR');
        }
      },
      {
        label: 'uses ticketNumber as fallback for ticketId when sessionId missing',
        payload: createPayload({ sessionId: undefined }),
        validator: (doc: any) => {
          expect(doc.ticketId).toBe('TK001');
        }
      },
      {
        label: 'sets correct template version',
        payload: createPayload(),
        validator: (doc: any) => {
          expect(doc.templateVersion).toBe('ticket-layout-v1');
        }
      },
      {
        label: 'includes paper width from environment',
        payload: createPayload(),
        validator: (doc: any) => {
          expect([58, 80]).toContain(doc.paperWidthMm);
        }
      },
      {
        label: 'uses default parking name from environment',
        payload: createPayload(),
        validator: (doc: any) => {
          expect(doc.parkingName).toBeDefined();
          expect(typeof doc.parkingName).toBe('string');
        }
      },
      {
        label: 'defaults to CAR vehicle type when missing',
        payload: createPayload({ receipt: { ...createPayload().receipt, vehicleType: undefined } }),
        validator: (doc: any) => {
          expect(doc.vehicleType).toBe('CAR');
        }
      },
      {
        label: 'handles missing optional receipt fields',
        payload: createPayload({
          receipt: {
            ticketNumber: 'TK002',
            plate: 'XYZ5678'
          }
        }),
        validator: (doc: any) => {
          expect(doc.site).toBeNull();
          expect(doc.lane).toBeNull();
          expect(doc.booth).toBeNull();
        }
      },
      {
        label: 'includes operator name when provided',
        payload: createPayload(),
        validator: (doc: any) => {
          // Check that operatorName field exists
          expect(doc).toHaveProperty('operatorName');
        }
      },
      {
        label: 'generates QR payload with ticket info',
        payload: createPayload(),
        validator: (doc: any) => {
          expect(doc.qrPayload).toBeDefined();
          const qrData = JSON.parse(doc.qrPayload);
          expect(qrData.t).toBe('TK001');
          expect(qrData.p).toBe('ABC1234');
        }
      },
      {
        label: 'sets barcode payload to null',
        payload: createPayload(),
        validator: (doc: any) => {
          expect(doc.barcodePayload).toBeNull();
        }
      },
      {
        label: 'sets copy number to 1',
        payload: createPayload(),
        validator: (doc: any) => {
          expect(doc.copyNumber).toBe(1);
        }
      },
      {
        label: 'includes printer profile',
        payload: createPayload(),
        validator: (doc: any) => {
          expect(doc.printerProfile).toBeDefined();
        }
      }
    ])('$label', ({ payload, validator }) => {
      const doc = buildTicketDocument(payload);
      validator(doc);
    });

    it('handles missing options parameter', () => {
      const payload = createPayload();
      const doc = buildTicketDocument(payload);

      expect(doc.operatorName).toBeNull();
    });

    it('applies operator name from options', () => {
      const payload = createPayload();
      const doc = buildTicketDocument(payload, { operatorName: 'John Doe' });

      expect(doc.operatorName).toBe('John Doe');
    });

    it('uses current time when entryAt is missing', () => {
      const payload = createPayload({ receipt: { ...createPayload().receipt, entryAt: undefined } });
      const beforeCall = new Date().toISOString();
      const doc = buildTicketDocument(payload);
      const afterCall = new Date().toISOString();

      expect(doc.issuedAtIso).toBeDefined();
      expect(new Date(doc.issuedAtIso).getTime()).toBeGreaterThanOrEqual(new Date(beforeCall).getTime() - 1000);
      expect(new Date(doc.issuedAtIso).getTime()).toBeLessThanOrEqual(new Date(afterCall).getTime() + 1000);
    });

    it('uses provided entryAt timestamp', () => {
      const entryTime = '2024-01-15T14:25:30Z';
      const payload = createPayload({ receipt: { ...createPayload().receipt, entryAt: entryTime } });
      const doc = buildTicketDocument(payload);

      expect(doc.issuedAtIso).toBe(entryTime);
    });

    it('generates valid ISO format QR payload', () => {
      const payload = createPayload();
      const doc = buildTicketDocument(payload);

      const qrData = JSON.parse(doc.qrPayload);
      expect(qrData).toHaveProperty('t'); // ticket
      expect(qrData).toHaveProperty('p'); // plate
      expect(qrData).toHaveProperty('e'); // entryAt
    });

    it('handles null optional fields in receipt', () => {
      const payload = createPayload({
        receipt: {
          ticketNumber: 'TK003',
          plate: 'DEF9999',
          site: null,
          lane: null,
          booth: null,
          terminal: null,
          parkingSpaceCode: null,
          entryAt: null
        }
      });
      const doc = buildTicketDocument(payload);

      expect(doc.site).toBeNull();
      expect(doc.lane).toBeNull();
      expect(doc.booth).toBeNull();
      expect(doc.terminal).toBeNull();
      expect(doc.parkingSpaceCode).toBeNull();
    });
  });

  describe('ticketDocumentToJson()', () => {
    it.each([
      {
        label: 'converts simple document to JSON string',
        doc: {
          ticketId: 'id1',
          templateVersion: 'v1',
          ticketNumber: 'TK001'
        }
      },
      {
        label: 'converts complex document to JSON string',
        doc: {
          ticketId: 'id2',
          templateVersion: 'v2',
          ticketNumber: 'TK002',
          nested: { deep: { value: 123 } },
          array: [1, 2, 3]
        }
      },
      {
        label: 'handles null values',
        doc: {
          ticketId: 'id3',
          barcodePayload: null,
          operatorName: null
        }
      }
    ])('$label', ({ doc }) => {
      const json = ticketDocumentToJson(doc as any);

      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed).toEqual(doc);
    });

    it('preserves all document properties in JSON', () => {
      const doc = {
        ticketId: 'test-id',
        templateVersion: 'v1',
        paperWidthMm: 58,
        ticketNumber: 'TK-123',
        parkingName: 'ParkFlow',
        plate: 'ABC1234',
        vehicleType: 'CAR' as const,
        site: 'Site A',
        copyNumber: 1,
        qrPayload: JSON.stringify({ test: 'data' })
      };

      const json = ticketDocumentToJson(doc as any);
      const parsed = JSON.parse(json);

      expect(parsed.ticketId).toBe('test-id');
      expect(parsed.templateVersion).toBe('v1');
      expect(parsed.paperWidthMm).toBe(58);
      expect(parsed.ticketNumber).toBe('TK-123');
    });

    it('produces valid JSON string', () => {
      const doc = { test: 'value', number: 42 };
      const json = ticketDocumentToJson(doc as any);

      expect(json.startsWith('{') || json.startsWith('[')).toBe(true);
      expect(json.endsWith('}') || json.endsWith(']')).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('builds and serializes complete ticket document', () => {
      const payload: OperationPayload = {
        sessionId: 'sess-abc123',
        receipt: {
          ticketNumber: 'PARK-001',
          plate: 'XYZ5678',
          vehicleType: 'MOTORCYCLE',
          site: 'Downtown Parking',
          lane: '2B',
          booth: 'B5',
          terminal: 'T1',
          parkingSpaceCode: 'P-B5-001',
          entryAt: '2024-01-20T09:15:00Z'
        }
      };

      const doc = buildTicketDocument(payload, { operatorName: 'Maria' });
      const json = ticketDocumentToJson(doc);

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.ticketId).toBe('sess-abc123');
      expect(parsed.operatorName).toBe('Maria');
    });

    it('handles minimal payload correctly', () => {
      const payload: OperationPayload = {
        receipt: {
          ticketNumber: 'MIN-001',
          plate: 'TEST001'
        }
      };

      const doc = buildTicketDocument(payload);
      const json = ticketDocumentToJson(doc);

      expect(json).toBeDefined();
      const parsed = JSON.parse(json);
      expect(parsed.ticketNumber).toBe('MIN-001');
      expect(parsed.plate).toBe('TEST001');
    });
  });
});
