// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  authHeaders,
  hasPermission,
  isOfflineLeaseValid,
  currentUser,
  patchSessionUser,
  canAccessSuperAdminPortal
} from '../auth-domain.service';
import * as authStorage from '../auth-storage.service';
import * as authApi from '@/features/auth/api/auth.api';

// Mock dependencies
vi.mock('../auth-storage.service', () => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(),
}));

vi.mock('@/features/auth/api/auth.api', () => ({
  refreshIfNeeded: vi.fn(),
  authHeadersApiKey: vi.fn().mockReturnValue('test-api-key'),
}));

vi.mock('@/lib/utils/storage', () => ({
  safeStorage: {
    getItem: vi.fn().mockReturnValue('mocked-terminal-123'),
  },
}));

describe('Auth Domain Service', () => {
  const mockSession = {
    accessToken: 'valid-access-token',
    refreshToken: 'valid-refresh-token',
    user: {
      id: 'usr-1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'ADMIN',
      permissions: ['read:users', 'write:users'] as any,
      active: true,
    },
    session: {
      sessionId: 'sess-1',
      userId: 'usr-1',
      deviceId: 'dev-1',
      accessTokenExpiresAtIso: new Date(Date.now() + 3600000).toISOString(),
    },
    offlineLease: {
      leaseId: 'lease-1',
      expiresAtIso: new Date(Date.now() + 86400000).toISOString(),
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authHeaders', () => {
    it('should return basic headers when no session exists', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);

      const headers = await authHeaders();
      
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key',
        'X-Parkflow-Terminal': 'mocked-terminal-123',
      });
      expect(authApi.refreshIfNeeded).not.toHaveBeenCalled();
    });

    it('should call refreshIfNeeded and return headers when session exists', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(mockSession);
      vi.mocked(authApi.refreshIfNeeded).mockResolvedValue(mockSession);

      const headers = await authHeaders({ auditReason: 'Test Audit', offline: true });

      expect(authApi.refreshIfNeeded).toHaveBeenCalledWith(mockSession);
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key',
        'X-Parkflow-Terminal': 'mocked-terminal-123',
        'X-Parkflow-Audit-Reason': 'Test Audit',
        'X-Parkflow-Offline': '1',
      });
    });

    it('should truncate long audit reasons', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);
      const longReason = 'a'.repeat(600);
      
      const headers = await authHeaders({ auditReason: longReason }) as Record<string, string>;
      
      expect(headers['X-Parkflow-Audit-Reason']).toHaveLength(500);
      expect(headers['X-Parkflow-Audit-Reason']).toEqual('a'.repeat(500));
    });
  });

  describe('hasPermission', () => {
    it('should return false if no session exists', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);
      const result = await hasPermission('read:users' as any);
      expect(result).toBe(false);
    });

    it('should return true if user has the permission', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(mockSession);
      const result = await hasPermission('read:users' as any);
      expect(result).toBe(true);
    });

    it('should return false if user lacks the permission', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(mockSession);
      const result = await hasPermission('delete:users' as any);
      expect(result).toBe(false);
    });
  });

  describe('isOfflineLeaseValid', () => {
    it('should return false if no session exists', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);
      const result = await isOfflineLeaseValid();
      expect(result).toBe(false);
    });

    it('should return false if session lacks offlineLease', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue({ ...mockSession, offlineLease: null });
      const result = await isOfflineLeaseValid();
      expect(result).toBe(false);
    });

    it('should return true if lease is valid', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(mockSession);
      const result = await isOfflineLeaseValid();
      expect(result).toBe(true);
    });

    it('should return false if lease is expired', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue({
        ...mockSession,
        offlineLease: {
          ...mockSession.offlineLease,
          expiresAtIso: new Date(Date.now() - 1000).toISOString(),
        }
      });
      const result = await isOfflineLeaseValid();
      expect(result).toBe(false);
    });
  });

  describe('currentUser', () => {
    it('should return user from session', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(mockSession);
      const user = await currentUser();
      expect(user).toEqual(mockSession.user);
    });

    it('should return null if no session', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);
      const user = await currentUser();
      expect(user).toBeNull();
    });
  });

  describe('patchSessionUser', () => {
    it('should not throw if session is null', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);
      await expect(patchSessionUser({ name: 'New Name' })).resolves.toBeUndefined();
      expect(authStorage.saveSession).not.toHaveBeenCalled();
    });

    it('should update user in session', async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(mockSession);
      await patchSessionUser({ name: 'Updated Name', active: false });

      expect(authStorage.saveSession).toHaveBeenCalledWith({
        ...mockSession,
        user: {
          ...mockSession.user,
          name: 'Updated Name',
          active: false,
        }
      });
    });
  });

  describe('canAccessSuperAdminPortal', () => {
    it('should return true if role is SUPER_ADMIN', () => {
      expect(canAccessSuperAdminPortal({ role: 'SUPER_ADMIN' } as any)).toBe(true);
    });

    it('should return false if role is not SUPER_ADMIN', () => {
      expect(canAccessSuperAdminPortal({ role: 'ADMIN' } as any)).toBe(false);
      expect(canAccessSuperAdminPortal(null)).toBe(false);
    });
  });
});
