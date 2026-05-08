import { http, HttpResponse } from 'msw'

export const handlers = [
  // Auth
  http.get('/api/v1/auth/me', () => {
    return HttpResponse.json({ user: { id: 1, name: 'Test User' } })
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
]