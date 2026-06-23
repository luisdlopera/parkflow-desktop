import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSessionMonitor } from '@/hooks/auth/useSessionMonitor';
import { useAuthStore } from '@/lib/stores/auth.store';
import * as authStorage from '@/features/auth/services/auth-storage.service';
import * as authApi from '@/features/auth/api/auth.api';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/features/auth/services/auth-storage.service', () => ({
  loadSession: vi.fn(),
  clearSession: vi.fn(),
}));

vi.mock('@/features/auth/api/auth.api', () => ({
  refreshIfNeeded: vi.fn(),
}));

function createMockSession(expiresInMs: number) {
  return {
    user: { id: '1', email: 'test@example.com', companyId: 'c1', permissions: [] },
    session: {
      sessionId: 'sess-1',
      deviceId: 'dev-1',
      accessTokenExpiresAtIso: new Date(Date.now() + expiresInMs).toISOString(),
    },
    offlineLease: null,
  };
}

describe('useSessionMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isLoading: false, user: null, isAuthenticated: false });
  });

  it('checks session on mount', async () => {
    vi.mocked(authStorage.loadSession).mockResolvedValue(createMockSession(3600000));

    const { result } = renderHook(() => useSessionMonitor());

    await waitFor(() => {
      expect(authStorage.loadSession).toHaveBeenCalled();
      expect(result.current.isExpired).toBe(false);
      expect(result.current.timeRemaining).toBeGreaterThan(0);
    });
  });

  it('detects expired session', async () => {
    vi.mocked(authStorage.loadSession).mockResolvedValue(createMockSession(-1000));

    const { result } = renderHook(() => useSessionMonitor());

    await waitFor(() => {
      expect(result.current.isExpired).toBe(true);
      expect(result.current.timeRemaining).toBe(0);
    });
    expect(authStorage.clearSession).toHaveBeenCalled();
  });

  it('handles no session gracefully', async () => {
    vi.mocked(authStorage.loadSession).mockResolvedValue(null);

    const { result } = renderHook(() => useSessionMonitor());

    await waitFor(() => {
      expect(result.current.isExpired).toBe(true);
      expect(result.current.timeRemaining).toBe(0);
    });
  });

  it('auto-refreshes session when near expiry', async () => {
    const session = createMockSession(2 * 60 * 1000);
    const refreshedSession = createMockSession(3600000);

    vi.mocked(authStorage.loadSession)
      .mockResolvedValueOnce(session)
      .mockResolvedValueOnce(refreshedSession);
    vi.mocked(authApi.refreshIfNeeded).mockResolvedValue(refreshedSession);

    const { result } = renderHook(() => useSessionMonitor());

    await waitFor(() => {
      expect(authApi.refreshIfNeeded).toHaveBeenCalledWith(session);
      expect(result.current.isExpired).toBe(false);
    });
  });

  it('triggers expiry when refresh fails', async () => {
    const session = createMockSession(2 * 60 * 1000);

    vi.mocked(authStorage.loadSession).mockResolvedValue(session);
    vi.mocked(authApi.refreshIfNeeded).mockRejectedValue(new Error('refresh failed'));

    const { result } = renderHook(() => useSessionMonitor());

    await waitFor(() => {
      expect(result.current.isExpired).toBe(true);
    });
  });

  it('responds to visibilitychange', async () => {
    vi.mocked(authStorage.loadSession).mockResolvedValue(createMockSession(3600000));

    const { result } = renderHook(() => useSessionMonitor());

    await waitFor(() => {
      expect(result.current.isExpired).toBe(false);
    });

    vi.mocked(authStorage.loadSession).mockClear();

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(authStorage.loadSession).toHaveBeenCalled();
    });
  });

  it('sets up periodic check interval', async () => {
    vi.useFakeTimers();
    vi.mocked(authStorage.loadSession).mockResolvedValue(createMockSession(3600000));

    renderHook(() => useSessionMonitor());

    await vi.advanceTimersByTimeAsync(60000);

    expect(authStorage.loadSession).toHaveBeenCalled();

    vi.mocked(authStorage.loadSession).mockClear();

    await vi.advanceTimersByTimeAsync(60000);

    expect(authStorage.loadSession).toHaveBeenCalled();
    vi.useRealTimers();
  });

  describe('forceLogout', () => {
    it('clears session and redirects to login', async () => {
      const { result } = renderHook(() => useSessionMonitor());

      await act(async () => {
        await result.current.forceLogout();
      });

      expect(authStorage.clearSession).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login?expired=1');
      expect(result.current.isExpired).toBe(true);
    });
  });

  describe('renewSession', () => {
    it('refreshes session and rechecks', async () => {
      const session = createMockSession(3600000);
      vi.mocked(authStorage.loadSession).mockResolvedValue(session);
      vi.mocked(authApi.refreshIfNeeded).mockResolvedValue(session);

      const { result } = renderHook(() => useSessionMonitor());

      await act(async () => {
        await result.current.renewSession();
      });

      expect(authApi.refreshIfNeeded).toHaveBeenCalledWith(session);
    });

    it('throws when no session', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);

      const { result } = renderHook(() => useSessionMonitor());

      await expect(result.current.renewSession()).rejects.toThrow('No hay sesión activa');
    });
  });

  it('returns isChecking state while loading', () => {
    useAuthStore.setState({ isLoading: true });
    vi.mocked(authStorage.loadSession).mockResolvedValue(createMockSession(3600000));

    const { result } = renderHook(() => useSessionMonitor());

    expect(result.current.isChecking).toBe(true);
  });
});
