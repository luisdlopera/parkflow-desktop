import { http, HttpResponse } from 'msw'

function mockCompany(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: 'Empresa Test',
    nit: '123456789',
    plan: 'SYNC',
    status: 'ACTIVE',
    maxDevices: 5,
    maxLocations: 3,
    maxUsers: 10,
    offlineModeAllowed: true,
    offlineLeaseHours: 48,
    modules: [],
    devices: [],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export const handlers = [
  // Auth
  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({ user: { id: 1, name: 'Test User', role: 'SUPER_ADMIN' } })
  }),

  // Operations
  http.post('/api/v1/operations/entries', () => {
    return HttpResponse.json({
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      ticketNumber: 'TICKET001'
    })
  }),

  http.post('/api/v1/operations/exits', () => {
    return HttpResponse.json({
      totalAmount: 5000,
      paymentMethod: 'CASH'
    })
  }),

  http.get('/api/v1/operations/sessions/active-list', () => {
    return HttpResponse.json([
      { ticketNumber: 'TICKET001', plate: 'ABC123', entryAt: '2024-01-01T10:00:00Z' }
    ])
  }),

  // Cash
  http.post('/api/v1/cash/open', () => {
    return HttpResponse.json({
      id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'OPEN'
    })
  }),

  http.get('/api/v1/cash/current', () => {
    return HttpResponse.json({
      id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'OPEN',
      balance: 0
    })
  }),

  // Licensing - Companies
  http.get('/api/v1/licensing/companies', () => {
    return HttpResponse.json([
      mockCompany('company-1', { name: 'Empresa Activa', status: 'ACTIVE', plan: 'SYNC' }),
      mockCompany('company-2', { name: 'Empresa Trial', status: 'TRIAL', plan: 'LOCAL' }),
      mockCompany('company-3', { name: 'Empresa Vencida', status: 'EXPIRED', plan: 'PRO',
        expiresAt: '2025-12-31T00:00:00Z', graceUntil: '2026-02-28T00:00:00Z' }),
    ])
  }),

  http.post('/api/v1/licensing/companies', () => {
    return HttpResponse.json(mockCompany('company-new', { name: 'Nueva Empresa' }), { status: 201 })
  }),

  // Licensing - License generation
  http.post('/api/v1/licensing/licenses/generate', () => {
    return HttpResponse.json({
      deviceId: 'device-1',
      licenseKey: 'license-key-123',
      signature: 'sig-abc',
      expiresAt: '2027-01-01T00:00:00Z',
      publicKey: 'pub-key-xyz',
    })
  }),

  // Licensing - Support
  http.get('/api/v1/licensing/support/cases/priority', () => {
    return HttpResponse.json([
      { id: 'case-1', companyId: 'company-1', companyName: 'Empresa Activa',
        reason: 'PAID_AFTER_BLOCK', createdAt: '2026-05-01T00:00:00Z', resolved: false },
    ])
  }),

  http.get('/api/v1/licensing/support/blocks/unresolved', () => {
    return HttpResponse.json([
      { id: 'block-1', companyId: 'company-3', reasonCode: 'TIME_ROLLBACK',
        createdAt: '2026-05-10T00:00:00Z', resolved: false },
    ])
  }),

  http.get('/api/v1/licensing/support/statistics', () => {
    return HttpResponse.json({
      totalBlocks: 10,
      unresolvedBlocks: 3,
      falsePositives: 1,
      resolvedToday: 2,
    })
  }),

  http.post('/api/v1/licensing/support/blocks/:id/resolve', () => {
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/v1/licensing/support/blocks/:id/false-positive', () => {
    return HttpResponse.json({ success: true })
  }),

  // Licensing - Audit
  http.get('/api/v1/licensing/audit', () => {
    return HttpResponse.json({
      content: [
        { id: 'audit-1', companyId: 'company-1', action: 'LICENSE_CREATED',
          description: 'Licencia generada', createdAt: '2026-05-01T00:00:00Z',
          performedBy: 'admin@parkflow.local' },
      ],
      totalPages: 1,
      totalElements: 1,
      size: 20,
      number: 0,
    })
  }),
]