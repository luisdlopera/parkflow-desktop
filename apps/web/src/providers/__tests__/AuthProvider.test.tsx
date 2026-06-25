import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { AuthProvider } from '@/providers/AuthProvider';
import { useAuthStore } from '@/lib/stores/auth.store';

const mockFetchWithCredentials = vi.fn();
const mockSaveSession = vi.fn();

vi.mock('@/lib/services/auth-storage.service', () => ({
  saveSession: (...args: any[]) => mockSaveSession(...args),
}));

vi.mock('@/lib/api/fetch-with-credentials', () => ({
  fetchWithCredentials: (...args: any[]) => mockFetchWithCredentials(...args),
}));

vi.mock('@/lib/api/config', () => ({
  authBase: vi.fn().mockReturnValue('http://localhost/api/auth'),
}));

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: true });
    mockFetchWithCredentials.mockReset();
    mockSaveSession.mockReset();
  });

  it('renders children', () => {
    const { getByText } = render(
      <AuthProvider>
        <div>child content</div>
      </AuthProvider>
    );

    expect(getByText('child content')).toBeDefined();
  });

  it('restores session on mount (success)', async () => {
    const payload = {
      user: { id: '1', name: 'Test', email: 'test@example.com', role: 'ADMIN' },
      session: { sessionId: 'sess-1' },
      offlineLease: null,
    };
    mockFetchWithCredentials.mockResolvedValue({
      ok: true,
      json: async () => payload,
    });

    render(
      <AuthProvider>
        <div>children</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockFetchWithCredentials).toHaveBeenCalledWith(
        'http://localhost/api/auth/restore-session',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );
      expect(mockSaveSession).toHaveBeenCalledWith({
        user: payload.user,
        session: payload.session,
        offlineLease: payload.offlineLease,
      });
      expect(useAuthStore.getState().user).toEqual(payload.user);
    });
  });

  it('sets loading state initially', () => {
    useAuthStore.setState({ isLoading: true, user: null });

    render(
      <AuthProvider>
        <div>children</div>
      </AuthProvider>
    );

    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  it('handles restore failure (response not ok)', async () => {
    mockFetchWithCredentials.mockResolvedValue({
      ok: false,
    });

    render(
      <AuthProvider>
        <div>children</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  it('handles network failure gracefully', async () => {
    mockFetchWithCredentials.mockRejectedValue(new Error('Network Error'));

    render(
      <AuthProvider>
        <div>children</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  it('handles timeout fallback (10s timeout sets user to null)', async () => {
    vi.useFakeTimers();
    mockFetchWithCredentials.mockReturnValue(new Promise(() => {}));

    render(
      <AuthProvider>
        <div>children</div>
      </AuthProvider>
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(useAuthStore.getState().user).toBeNull();

    vi.useRealTimers();
  });

  it('does not restore session twice', async () => {
    mockFetchWithCredentials.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: '1', name: 'Test', email: 'test@example.com', role: 'ADMIN' },
        session: { sessionId: 'sess-1' },
        offlineLease: null,
      }),
    });

    const { rerender } = render(
      <AuthProvider>
        <div>children</div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockFetchWithCredentials).toHaveBeenCalledTimes(1);
    });

    rerender(
      <AuthProvider>
        <div>children</div>
      </AuthProvider>
    );

    expect(mockFetchWithCredentials).toHaveBeenCalledTimes(1);
  });
});
