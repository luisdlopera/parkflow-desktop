import { useState, useCallback } from 'react';
import { apiBase } from '@/lib/api/config';
import safeFetch from '@/lib/api/fetch';

const API_BASE = apiBase();

type ModuleConfig = {
  clientsEnabled: boolean;
  agreementsEnabled: boolean;
  monthlyEnabled: boolean;
  shiftsEnabled: boolean;
  cashEnabled: boolean;
  advancedAuditEnabled: boolean;
  licensePlan: string;
};

type CapacityConfig = {
  totalCapacity?: number;
  controlSlots?: boolean;
  allowLowerCapacity?: boolean;
};

type ShiftsConfig = {
  shiftsEnabled?: boolean;
  dayShiftStart?: string;
  dayShiftEnd?: string;
};

type RegionConfig = {
  countryCode?: string;
  platePattern?: string;
  timezone?: string;
};

type HelmetHandlingConfig = {
  currentMode?: string;
  activeLockerCount?: number;
  inactiveLockerCount?: number;
};

export function useConfigurationApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(
    async <T,>(endpoint: string, method: 'GET' | 'PATCH' = 'GET', body?: any): Promise<T> => {
      setLoading(true);
      setError(null);
      try {
        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        };

        if (body && method !== 'GET') {
          options.body = JSON.stringify(body);
        }

        const url = `${API_BASE}${endpoint}`;
        return await safeFetch<T>(url, options);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Configuration endpoints
  return {
    loading,
    error,
    getCapacity: (companyId: string) =>
      apiCall<CapacityConfig>(`/configuration/capacity?companyId=${companyId}`),
    updateCapacity: (companyId: string, data: any) =>
      apiCall<CapacityConfig>(`/configuration/capacity?companyId=${companyId}`, 'PATCH', data),

    getShifts: (companyId: string) =>
      apiCall<ShiftsConfig>(`/configuration/shifts?companyId=${companyId}`),
    updateShifts: (companyId: string, data: any) =>
      apiCall<ShiftsConfig>(`/configuration/shifts?companyId=${companyId}`, 'PATCH', data),

    getModules: (companyId: string) =>
      apiCall<ModuleConfig>(`/configuration/modules?companyId=${companyId}`),
    updateModules: (companyId: string, data: any) =>
      apiCall<ModuleConfig>(`/configuration/modules?companyId=${companyId}`, 'PATCH', data),

    getRegion: (companyId: string) =>
      apiCall<RegionConfig>(`/configuration/region?companyId=${companyId}`),
    updateRegion: (companyId: string, data: any) =>
      apiCall<RegionConfig>(`/configuration/region?companyId=${companyId}`, 'PATCH', data),

    getHelmetHandling: (companyId: string) =>
      apiCall<HelmetHandlingConfig>(`/configuration/helmet-handling?companyId=${companyId}`),
    updateHelmetHandling: (companyId: string, data: any) =>
      apiCall<HelmetHandlingConfig>(`/configuration/helmet-handling?companyId=${companyId}`, 'PATCH', data),
  };
}
