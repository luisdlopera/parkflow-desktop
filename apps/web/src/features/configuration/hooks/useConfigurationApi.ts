import { useState, useCallback } from 'react';
import { apiBase } from '@/lib/api/config';
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";


const API_BASE = apiBase();

export function useConfigurationApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(
    async (endpoint: string, method: 'GET' | 'PATCH' = 'GET', body?: any) => {
      setLoading(true);
      setError(null);
      try {
        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionStorage.getItem('token')}`,
          },
        };

        if (body && method !== 'GET') {
          options.body = JSON.stringify(body);
        }

        const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
        const response = await fetchWithCredentials(url.toString(), options);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
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
      apiCall(`/configuration/capacity?companyId=${companyId}`),
    updateCapacity: (companyId: string, data: any) =>
      apiCall(`/configuration/capacity?companyId=${companyId}`, 'PATCH', data),

    getShifts: (companyId: string) =>
      apiCall(`/configuration/shifts?companyId=${companyId}`),
    updateShifts: (companyId: string, data: any) =>
      apiCall(`/configuration/shifts?companyId=${companyId}`, 'PATCH', data),

    getModules: (companyId: string) =>
      apiCall(`/configuration/modules?companyId=${companyId}`),
    updateModules: (companyId: string, data: any) =>
      apiCall(`/configuration/modules?companyId=${companyId}`, 'PATCH', data),

    getRegion: (companyId: string) =>
      apiCall(`/configuration/region?companyId=${companyId}`),
    updateRegion: (companyId: string, data: any) =>
      apiCall(`/configuration/region?companyId=${companyId}`, 'PATCH', data),

    getHelmetHandling: (companyId: string) =>
      apiCall(`/configuration/helmet-handling?companyId=${companyId}`),
    updateHelmetHandling: (companyId: string, data: any) =>
      apiCall(`/configuration/helmet-handling?companyId=${companyId}`, 'PATCH', data),
  };
}
