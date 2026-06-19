import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queueOfflineOperation } from '../lib/offline-outbox';
import { isOfflineLeaseValid, loadSession } from '../lib/auth';

// Mock auth module
vi.mock('../lib/auth', () => ({
  isOfflineLeaseValid: vi.fn(),
  loadSession: vi.fn()
}));

// Mock tauri core
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args)
}));

describe('offline-outbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate being in Tauri environment
    (window as any).__TAURI_INTERNALS__ = {};
  });

  it('should return false if not in Tauri environment', async () => {
    delete (window as any).__TAURI_INTERNALS__;
    const result = await queueOfflineOperation('ENTRY_RECORDED', { plate: 'ABC123' });
    expect(result).toBe(false);
  });

  it('should return false if offline lease is invalid', async () => {
    vi.mocked(isOfflineLeaseValid).mockResolvedValue(false);
    const result = await queueOfflineOperation('ENTRY_RECORDED', { plate: 'ABC123' });
    expect(result).toBe(false);
  });

  it('should invoke enqueue_outbox_event if lease and session are valid', async () => {
    vi.mocked(isOfflineLeaseValid).mockResolvedValue(true);
    vi.mocked(loadSession).mockResolvedValue({
      user: { id: 'user-1' },
      session: { deviceId: 'device-1', sessionId: 'session-1' }
    } as any);

    const result = await queueOfflineOperation('ENTRY_RECORDED', { plate: 'ABC123' });

    expect(result).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('enqueue_outbox_event', expect.objectContaining({
      request: expect.objectContaining({
        event_type: 'ENTRY_RECORDED',
        user_id: 'user-1',
        device_id: 'device-1'
      })
    }));
  });
});
