import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { useOnboardingStatus } from '@/hooks/auth/useOnboardingStatus';
import * as onboardingApi from '@/lib/api/onboarding.api';

vi.mock('@/lib/onboarding-api', () => ({
  fetchOnboardingStatus: vi.fn(),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      {children}
    </SWRConfig>
  );
}

describe('useOnboardingStatus', () => {
  const mockStatus = {
    companyId: 'company-1',
    plan: 'PRO',
    onboardingCompleted: false,
    currentStep: 2,
    skipped: false,
    progressData: {},
    availableOptionsByPlan: {},
    enabledSteps: [1, 2, 3],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    vi.mocked(onboardingApi.fetchOnboardingStatus).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useOnboardingStatus('company-1'), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('fetches status on mount and returns data', async () => {
    vi.mocked(onboardingApi.fetchOnboardingStatus).mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useOnboardingStatus('company-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(mockStatus), { timeout: 5000 });

    expect(onboardingApi.fetchOnboardingStatus).toHaveBeenCalledWith('company-1');
  });

  it('returns error state on fetch failure', async () => {
    vi.mocked(onboardingApi.fetchOnboardingStatus).mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useOnboardingStatus('company-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.error).toBeDefined(), { timeout: 5000 });
  });

  it('does not fetch when companyId is null', () => {
    const { result } = renderHook(() => useOnboardingStatus(null), {
      wrapper: Wrapper,
    });

    expect(result.current.data).toBeUndefined();
    expect(onboardingApi.fetchOnboardingStatus).not.toHaveBeenCalled();
  });
});
