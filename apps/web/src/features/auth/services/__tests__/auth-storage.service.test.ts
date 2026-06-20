import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadSession, saveSession, clearSession, tauriInvoke } from '../auth-storage.service';

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args)
}));

describe('Auth Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue(null);
    vi.stubGlobal('window', {
      __TAURI_INTERNALS__: {
        invoke: vi.fn(),
      }
    });
  });

  describe('tauriInvoke', () => {
    it('should return null if not in browser', async () => {
      vi.stubGlobal('window', undefined);
      const result = await tauriInvoke('cmd');
      expect(result).toBeNull();
    });

    it('should return null if tauri internals not present', async () => {
      vi.stubGlobal('window', {});
      const result = await tauriInvoke('cmd');
      expect(result).toBeNull();
    });
  });

  describe('loadSession', () => {
    it('should load from tauri if available', async () => {
      mockInvoke.mockResolvedValue({ accessToken: 'tauri-token' });
      const session = await loadSession();
      const session2 = await loadSession();
      
      expect(session).toEqual({ accessToken: 'tauri-token' });
      expect(session2).toEqual({ accessToken: 'tauri-token' });
    });
  });

  describe('saveSession', () => {
    it('should save to memory and tauri', async () => {
      mockInvoke.mockResolvedValue(undefined);
      
      await saveSession({ accessToken: 'new-token' } as any);
      const session = await loadSession();
      expect(session).toEqual({ accessToken: 'new-token' });
    });
  });

  describe('clearSession', () => {
    it('should clear memory and tauri', async () => {
      await saveSession({ accessToken: 'new-token' } as any);
      await clearSession();
      
      mockInvoke.mockResolvedValue(null);
      
      const session = await loadSession();
      expect(session).toBeNull();
    });
  });
});
