import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logoutFromApi, logoutAllSessions, logoutDevice, refreshIfNeeded, authHeadersApiKey } from '../auth.api';
import * as authStorage from '@/lib/services/auth-storage.service';
import * as fetchModule from '@/lib/api/fetch-with-credentials';
import * as config from '@/lib/api/config';

vi.mock('@/lib/services/auth-storage.service', () => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
}));

vi.mock('@/lib/api/fetch-with-credentials', () => ({
  fetchWithCredentials: vi.fn(),
}));

vi.mock('@/lib/api/config', () => ({
  authBase: vi.fn().mockReturnValue('http://localhost/api/auth'),
  API_CONFIG: { apiKey: 'test-api-key' },
}));

vi.stubEnv('NEXT_PUBLIC_API_KEY', 'test-api-key');

describe('Auth API', () => {
  const mockSessionPayload = {
    user: { id: 'usr-1', email: 'test@example.com' },
    session: { sessionId: 'sess-1', deviceId: 'dev-1', accessTokenExpiresAtIso: new Date(Date.now() + 86400000).toISOString() },
    offlineLease: null,
    rememberMe: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authHeadersApiKey', () => {
    it('returns api key from env', () => {
      expect(authHeadersApiKey()).toBe('test-api-key');
    });
  });

  describe('login', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('throws error if fetch fails', async () => {
      vi.mocked(fetchModule.fetchWithCredentials).mockResolvedValue({
        ok: false,
      } as any);

      await expect(login({ email: 'test@example.com', password: 'password', deviceId: 'dev-1', deviceName: 'test', platform: 'test', fingerprint: 'test' } as any))
        .rejects.toThrow('Credenciales invalidas o equipo no autorizado');
    });

    it('returns session and saves it on success', async () => {
      vi.mocked(fetchModule.fetchWithCredentials).mockResolvedValue({
        ok: true,
        json: async () => mockSessionPayload,
      } as any);

      const result = await login({ email: 'test@example.com', password: 'password', deviceId: 'dev-1', deviceName: 'test', platform: 'test', fingerprint: 'test' } as any);

      expect(result).toEqual({
        user: mockSessionPayload.user,
        session: mockSessionPayload.session,
        offlineLease: mockSessionPayload.offlineLease,
        rememberMe: mockSessionPayload.rememberMe,
      });
      expect(authStorage.saveSession).toHaveBeenCalledWith(result);
    });

    it('clears logout flag after successful login', async () => {
      // Set logout flag before login
      localStorage.setItem('parkflow_just_logged_out', 'true');

      vi.mocked(fetchModule.fetchWithCredentials).mockResolvedValue({
        ok: true,
        json: async () => mockSessionPayload,
      } as any);

      await login({ email: 'test@example.com', password: 'password', deviceId: 'dev-1', deviceName: 'test', platform: 'test', fingerprint: 'test' } as any);

      // Flag should be cleared after login
      expect(localStorage.getItem('parkflow_just_logged_out')).toBeNull();
    });
  });

  describe('logoutFromApi', () => {
    it('calls logout endpoint', async () => {
      vi.mocked(fetchModule.fetchWithCredentials).mockResolvedValue({ ok: true } as any);
      await logoutFromApi({ session: { sessionId: 'sess-1' } } as any);
      
      expect(fetchModule.fetchWithCredentials).toHaveBeenCalledWith(
        'http://localhost/api/auth/logout',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('logoutAllSessions', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('does nothing if no session', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);
      await logoutAllSessions();
      expect(fetchModule.fetchWithCredentials).not.toHaveBeenCalled();
    });

    it('calls logout all endpoint and clears session', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue({} as any);
      vi.mocked(fetchModule.fetchWithCredentials).mockResolvedValue({ ok: true } as any);

      await logoutAllSessions();

      expect(fetchModule.fetchWithCredentials).toHaveBeenCalledWith(
        'http://localhost/api/auth/logout/all',
        expect.objectContaining({ method: 'POST' })
      );
      expect(authStorage.clearSession).toHaveBeenCalled();
    });

    it('sets logout flag immediately to prevent session restoration', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue({} as any);
      vi.mocked(fetchModule.fetchWithCredentials).mockResolvedValue({ ok: true } as any);

      // Flag should not exist before logout
      expect(localStorage.getItem('parkflow_just_logged_out')).toBeNull();

      await logoutAllSessions();

      // Flag should be set after logout to prevent session restoration
      expect(localStorage.getItem('parkflow_just_logged_out')).toBe('true');
      expect(authStorage.clearSession).toHaveBeenCalled();
    });

    it('clears session even if logout endpoint fails', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue({} as any);
      vi.mocked(fetchModule.fetchWithCredentials).mockRejectedValue(new Error('Network error'));

      await logoutAllSessions();

      // Should still set logout flag
      expect(localStorage.getItem('parkflow_just_logged_out')).toBe('true');
      // Should still clear session
      expect(authStorage.clearSession).toHaveBeenCalled();
    });
  });

  describe('logoutDevice', () => {
    it('calls logout device endpoint', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue({} as any);
      vi.mocked(fetchModule.fetchWithCredentials).mockResolvedValue({ ok: true } as any);
      
      await logoutDevice('dev-1');
      
      expect(fetchModule.fetchWithCredentials).toHaveBeenCalledWith(
        'http://localhost/api/auth/logout/device/dev-1',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('refreshIfNeeded', () => {
    it('returns current session if not expired or close to expiry', async () => {
      const result = await refreshIfNeeded({
        session: { accessTokenExpiresAtIso: new Date(Date.now() + 3600000).toISOString() }
      } as any);
      expect(result.session.accessTokenExpiresAtIso).toBeDefined();
      expect(fetchModule.fetchWithCredentials).not.toHaveBeenCalled();
    });

    it('calls refresh endpoint if close to expiry', async () => {
      const currentSession = {
        session: { deviceId: 'dev-1', accessTokenExpiresAtIso: new Date(Date.now() + 10000).toISOString() }
      };

      vi.mocked(fetchModule.fetchWithCredentials).mockResolvedValue({
        ok: true,
        json: async () => mockSessionPayload,
      } as any);

      const result = await refreshIfNeeded(currentSession as any);
      
      expect(fetchModule.fetchWithCredentials).toHaveBeenCalledWith(
        'http://localhost/api/auth/refresh',
        expect.objectContaining({ method: 'POST' })
      );
      expect(authStorage.saveSession).toHaveBeenCalled();
      expect(result.user).toBeDefined();
    });

    it('clears session and throws error if refresh fails', async () => {
      const currentSession = {
        session: { deviceId: 'dev-1', accessTokenExpiresAtIso: new Date(Date.now() - 10000).toISOString() }
      };

      vi.mocked(fetchModule.fetchWithCredentials).mockResolvedValue({
        ok: false,
      } as any);

      await expect(refreshIfNeeded(currentSession as any)).rejects.toThrow('No se pudo refrescar la sesion');
      expect(authStorage.clearSession).toHaveBeenCalled();
    });
  });
});
