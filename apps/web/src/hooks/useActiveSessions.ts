import useSWR from "swr";
import { fetchActiveSessions, fetchParkingSummary, GetActiveSessionsQuery } from "@/lib/api/sessions-api";
import { useDebounce } from "@/shared/hooks/infrastructure/useDebounce";

async function fetchSessionsData([key, params]: [string, GetActiveSessionsQuery]) {
  const [sessionsRes, summary] = await Promise.all([
    fetchActiveSessions(params),
    fetchParkingSummary().catch(() => null) // We allow summary to fail gracefully
  ]);
  return { sessions: sessionsRes, summary };
}

export function useActiveSessions(params: GetActiveSessionsQuery = {}) {
  // Debounce the search term to avoid spamming the API while typing
  const debouncedSearch = useDebounce(params.search, 500);
  
  const queryKey: [string, GetActiveSessionsQuery] = ["active-sessions", { ...params, search: debouncedSearch }];

  const { data, error, isLoading, mutate } = useSWR(
    queryKey,
    fetchSessionsData,
    {
      refreshInterval: 5000, // Polling to simulate real-time updates
      revalidateOnFocus: true,
      errorRetryCount: 3,
      keepPreviousData: true // Keep showing old data while fetching new page
    }
  );

  const sessionsData = data?.sessions;
  const isArray = Array.isArray(sessionsData);
  
  const rows = isArray 
    ? sessionsData 
    : (sessionsData?.data ?? []);
    
  const meta = isArray
    ? { total: sessionsData.length, page: 1, limit: sessionsData.length, totalPages: 1 }
    : (sessionsData?.meta ?? null);

  return {
    rows,
    meta,
    summary: data?.summary ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    reload: mutate
  };
}
