import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCurrentCompanyId } from '@/lib/current-company';
import * as authStorage from '@/features/auth/services/auth-storage.service';

vi.mock('@/features/auth/services/auth-storage.service', () => ({
  loadSession: vi.fn(),
}));

describe('resolveCurrentCompanyId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns companyId from session user', async () => {
    vi.mocked(authStorage.loadSession).mockResolvedValue({
      user: { companyId: 'company-123' },
      session: {} as any,
      offlineLease: null,
    });

    const result = await resolveCurrentCompanyId();
    expect(result).toBe('company-123');
  });

  it('returns null when session is missing', async () => {
    vi.mocked(authStorage.loadSession).mockResolvedValue(null);

    const result = await resolveCurrentCompanyId();
    expect(result).toBeNull();
  });

  it('returns null when user has no companyId', async () => {
    vi.mocked(authStorage.loadSession).mockResolvedValue({
      user: {},
      session: {} as any,
      offlineLease: null,
    });

    const result = await resolveCurrentCompanyId();
    expect(result).toBeNull();
  });

  it('returns null when loadSession throws', async () => {
    vi.mocked(authStorage.loadSession).mockRejectedValue(new Error('storage error'));

    await expect(resolveCurrentCompanyId()).rejects.toThrow('storage error');
  });
});
