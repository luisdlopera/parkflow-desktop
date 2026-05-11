// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'

const enqueueCashMovementOffline = vi.fn()
const listCashOutboxPending = vi.fn()
const markCashOutboxError = vi.fn()
const removeCashOutboxRow = vi.fn()

const enqueueLocalPrint = vi.fn()
const getJobById = vi.fn()
const markJobDone = vi.fn()
const markJobRetryOrDead = vi.fn()
const listQueueStats = vi.fn()

vi.mock('../lib/cash/cash-outbox-idb', () => ({
  enqueueCashMovementOffline,
  listCashOutboxPending,
  markCashOutboxError,
  removeCashOutboxRow
}))

vi.mock('../lib/print/print-queue-idb', () => ({
  enqueueLocalPrint,
  getJobById,
  markJobDone,
  markJobRetryOrDead,
  listQueueStats
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('indexeddb storage backend', () => {
  it('delegates outbox and print operations', async () => {
    const { IndexedDBStorage } = await import('../lib/storage/indexeddb-storage')
    const storage = new IndexedDBStorage()

    await expect(
      storage.outboxEnqueue({
        idempotencyKey: 'k1',
        eventType: 'CASH_MOVEMENT',
        payload: { sessionId: 's1', amount: 1000 },
        origin: 'OFFLINE_PENDING_SYNC',
        status: 'pending',
        retryCount: 0
      })
    ).resolves.toMatch(/^cash:s1:/)
    expect(enqueueCashMovementOffline).toHaveBeenCalledWith('s1', { sessionId: 's1', amount: 1000 })

    await storage.outboxMarkSynced('cash:row-1:123')
    await storage.outboxMarkFailed('cash:row-2:123', 'boom')
    expect(removeCashOutboxRow).toHaveBeenCalledWith('row-1')
    expect(markCashOutboxError).toHaveBeenCalledWith('row-2', 'boom')

    await storage.printEnqueue({
      idempotencyKey: 'print-1',
      documentType: 'ENTRY',
      ticket: { ticketId: 'tid-1' },
      attempts: 0,
      maxAttempts: 12,
      status: 'pending',
      nextRetryAt: 0,
      sessionId: 'session-1',
      operatorUserId: 'operator-1'
    })
    expect(enqueueLocalPrint).toHaveBeenCalledWith('print-1', 'ENTRY', { ticketId: 'tid-1' }, {
      sessionId: 'session-1',
      operatorUserId: 'operator-1'
    })

    getJobById.mockResolvedValue({ id: 'print-1', attempts: 1 })
    await storage.printMarkRetryOrDead('print-1', 'retry later')
    expect(getJobById).toHaveBeenCalledWith('print-1')
    expect(markJobRetryOrDead).toHaveBeenCalledWith({ id: 'print-1', attempts: 1 }, 'retry later')

    listQueueStats.mockResolvedValue({ pending: 2, dead: 1 })
    await expect(storage.printGetStats()).resolves.toEqual({ pending: 2, dead: 1 })
  })

  it('tracks connectivity state in memory', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const { IndexedDBStorage } = await import('../lib/storage/indexeddb-storage')
    const storage = new IndexedDBStorage()

    await storage.updateConnectivityState(false, 'offline')
    await expect(storage.getConnectivityState()).resolves.toMatchObject({
      isOnline: false,
      lastError: 'offline'
    })
  })
})
