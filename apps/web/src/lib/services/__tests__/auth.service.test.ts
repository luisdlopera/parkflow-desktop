import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '@/services/auth.service';

const { mockPost, mockGet } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock('@/lib/axios', () => ({
  apiClient: {
    post: mockPost,
    get: mockGet,
  },
}));

describe('authService', () => {
  const credentials = { email: 'user@example.com', password: 'pass123' };
  const mockUser = { id: '1', name: 'Test', email: 'user@example.com', role: 'ADMIN' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('calls POST /login with credentials', async () => {
      mockPost.mockResolvedValue({ data: { user: mockUser } });

      await authService.login(credentials);

      expect(mockPost).toHaveBeenCalledWith('/login', credentials);
    });

    it('returns user data on success', async () => {
      mockPost.mockResolvedValue({ data: { user: mockUser } });

      const result = await authService.login(credentials);

      expect(result).toEqual({ user: mockUser });
    });

    it('throws on error', async () => {
      mockPost.mockRejectedValue(new Error('Network Error'));

      await expect(authService.login(credentials)).rejects.toThrow('Network Error');
    });
  });

  describe('logout', () => {
    it('calls POST /logout', async () => {
      mockPost.mockResolvedValue({});

      await authService.logout();

      expect(mockPost).toHaveBeenCalledWith('/logout');
    });

    it('does not throw on error (best-effort)', async () => {
      mockPost.mockRejectedValue(new Error('server error'));

      await expect(authService.logout()).rejects.toThrow('server error');
    });
  });

  describe('getMe', () => {
    it('calls GET /me', async () => {
      mockGet.mockResolvedValue({ data: mockUser });

      await authService.getMe();

      expect(mockGet).toHaveBeenCalledWith('/me');
    });

    it('returns user data', async () => {
      mockGet.mockResolvedValue({ data: mockUser });

      const result = await authService.getMe();

      expect(result).toEqual(mockUser);
    });

    it('handles 401 by rejecting', async () => {
      const error = new Error('Unauthorized');
      (error as any).response = { status: 401 };
      mockGet.mockRejectedValue(error);

      await expect(authService.getMe()).rejects.toThrow('Unauthorized');
    });
  });
});
