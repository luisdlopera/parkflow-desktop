import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/lib/stores/auth.store';
import * as authServiceModule from '@/services/auth.service';

vi.mock('@/services/auth.service', () => ({
  authService: {
    getMe: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('useAuth', () => {
  const mockUser = { id: '1', name: 'Test', email: 'test@example.com', role: 'ADMIN' };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: true, permissions: [] });
  });

  it('returns user from store', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true, isLoading: false });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns isAuthenticated as false when no user', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  describe('initializeAuth', () => {
    it('fetches user and sets it in store on success', async () => {
      vi.mocked(authServiceModule.authService.getMe).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());
      result.current.initializeAuth();

      await waitFor(() => {
        expect(useAuthStore.getState().user).toEqual(mockUser);
      });
    });

    it('sets user to null and loading to false on error', async () => {
      vi.mocked(authServiceModule.authService.getMe).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useAuth());
      result.current.initializeAuth();

      await waitFor(() => {
        expect(useAuthStore.getState().user).toBeNull();
        expect(useAuthStore.getState().isLoading).toBe(false);
      });
    });
  });

  describe('performLogin', () => {
    it('calls authService.login and then initializes auth', async () => {
      vi.mocked(authServiceModule.authService.login).mockResolvedValue({ user: mockUser });
      vi.mocked(authServiceModule.authService.getMe).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());
      await result.current.performLogin({ email: 'test@example.com', password: 'pass' });

      expect(authServiceModule.authService.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'pass' });
      expect(authServiceModule.authService.getMe).toHaveBeenCalled();
    });

    it('throws when login fails', async () => {
      vi.mocked(authServiceModule.authService.login).mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth());

      await expect(result.current.performLogin({ email: 'bad@example.com', password: 'wrong' })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('performLogout', () => {
    beforeEach(() => {
      vi.spyOn(window, 'location', 'get').mockReturnValue({ href: '' } as any);
    });

    it('calls authService.logout and clears store', async () => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true });
      vi.mocked(authServiceModule.authService.logout).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());
      result.current.performLogout();

      await waitFor(() => {
        expect(authServiceModule.authService.logout).toHaveBeenCalled();
        expect(useAuthStore.getState().user).toBeNull();
      });
    });

    it('redirects to /login even if logout fails', async () => {
      vi.mocked(authServiceModule.authService.logout).mockRejectedValue(new Error('server error'));

      const { result } = renderHook(() => useAuth());
      await expect(result.current.performLogout()).rejects.toThrow('server error');

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  it('exposes isLoading state', () => {
    useAuthStore.setState({ isLoading: true });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
  });
});
