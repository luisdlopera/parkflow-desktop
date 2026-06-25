import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePermissions } from '@/hooks/auth/usePermissions';
import * as authDomain from '@/lib/services/auth-domain.service';

vi.mock('@/lib/services/auth-domain.service', () => ({
  hasPermission: vi.fn(),
}));

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty perms by default', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.perms).toEqual({});
  });

  it('hasPermission checks individual permission', async () => {
    vi.mocked(authDomain.hasPermission).mockResolvedValue(true);

    const { result } = renderHook(() => usePermissions());
    await result.current.refresh(['perm:read']);

    await waitFor(() => {
      expect(result.current.perms['perm:read']).toBe(true);
    });
  });

  it('handles multiple permissions', async () => {
    vi.mocked(authDomain.hasPermission)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const { result } = renderHook(() => usePermissions());
    await result.current.refresh(['perm:read', 'perm:write', 'perm:delete']);

    await waitFor(() => {
      expect(result.current.perms).toEqual({
        'perm:read': true,
        'perm:write': false,
        'perm:delete': true,
      });
    });
  });

  it('handles empty permission list', async () => {
    const { result } = renderHook(() => usePermissions());
    await result.current.refresh([]);

    expect(result.current.perms).toEqual({});
  });

  it('returns setPerms to manually set permissions', () => {
    const { result } = renderHook(() => usePermissions());
    act(() => { result.current.setPerms({ 'manual:perm': true }); });

    expect(result.current.perms).toEqual({ 'manual:perm': true });
  });

  it('handles hasPermission rejection gracefully', async () => {
    vi.mocked(authDomain.hasPermission).mockRejectedValue(new Error('service error'));

    const { result } = renderHook(() => usePermissions());

    await expect(result.current.refresh(['perm:read'])).rejects.toThrow('service error');
  });
});
