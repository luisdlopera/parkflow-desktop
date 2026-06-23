import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { TenantConfigProvider } from '@/providers/TenantConfigProvider';
import { useTenantStore } from '@/lib/stores/tenant.store';

const mockFetchRuntimeConfig = vi.fn();

vi.mock('@/lib/runtime-config', () => ({
  fetchRuntimeConfig: (...args: any[]) => mockFetchRuntimeConfig(...args),
}));

const mockConfig = {
  vehicleTypes: ['CAR', 'MOTORCYCLE'],
  modules: { cash: true },
  features: { agreements: true },
  operationConfiguration: { graceMinutes: 15 },
};

describe('TenantConfigProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTenantStore.setState({
      runtimeConfig: null,
      loading: false,
      error: false,
    });
    mockFetchRuntimeConfig.mockReset();
  });

  it('renders children', () => {
    const { getByText } = render(
      <TenantConfigProvider>
        <div>child content</div>
      </TenantConfigProvider>
    );

    expect(getByText('child content')).toBeDefined();
  });

  it('fetches config on mount when store is empty', async () => {
    mockFetchRuntimeConfig.mockResolvedValue(mockConfig);

    render(
      <TenantConfigProvider>
        <div>child</div>
      </TenantConfigProvider>
    );

    await waitFor(() => {
      expect(mockFetchRuntimeConfig).toHaveBeenCalled();
      expect(useTenantStore.getState().runtimeConfig).toEqual(mockConfig);
    });
  });

  it('stores config in tenant store', async () => {
    mockFetchRuntimeConfig.mockResolvedValue(mockConfig);

    render(
      <TenantConfigProvider>
        <div>child</div>
      </TenantConfigProvider>
    );

    await waitFor(() => {
      expect(useTenantStore.getState().runtimeConfig).toEqual(mockConfig);
      expect(useTenantStore.getState().loading).toBe(false);
      expect(useTenantStore.getState().error).toBe(false);
    });
  });

  it('handles fetch error', async () => {
    mockFetchRuntimeConfig.mockRejectedValue(new Error('Network Error'));

    render(
      <TenantConfigProvider>
        <div>child</div>
      </TenantConfigProvider>
    );

    await waitFor(() => {
      expect(useTenantStore.getState().error).toBe(true);
    });
  });

  it('handles null config response', async () => {
    mockFetchRuntimeConfig.mockResolvedValue(null);

    render(
      <TenantConfigProvider>
        <div>child</div>
      </TenantConfigProvider>
    );

    await waitFor(() => {
      expect(useTenantStore.getState().error).toBe(true);
    });
  });

  it('listens to parkflow-refresh-runtime-config custom event', async () => {
    mockFetchRuntimeConfig.mockResolvedValue(mockConfig);

    render(
      <TenantConfigProvider>
        <div>child</div>
      </TenantConfigProvider>
    );

    await waitFor(() => {
      expect(mockFetchRuntimeConfig).toHaveBeenCalledTimes(1);
    });

    mockFetchRuntimeConfig.mockClear();
    mockFetchRuntimeConfig.mockResolvedValue(mockConfig);

    act(() => {
      window.dispatchEvent(new CustomEvent('parkflow-refresh-runtime-config'));
    });

    await waitFor(() => {
      expect(mockFetchRuntimeConfig).toHaveBeenCalled();
    });
  });

  it('does not re-fetch when config already exists', () => {
    useTenantStore.setState({
      runtimeConfig: mockConfig,
      loading: false,
      error: false,
    });

    render(
      <TenantConfigProvider>
        <div>child</div>
      </TenantConfigProvider>
    );

    expect(mockFetchRuntimeConfig).not.toHaveBeenCalled();
  });
});
