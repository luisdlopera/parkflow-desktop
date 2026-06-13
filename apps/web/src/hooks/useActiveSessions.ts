import useSWR from "swr";
import { fetchActiveSessions, fetchParkingSummary } from "@/services/sessions.service";

async function fetchSessionsData() {
  const [sessions, summary] = await Promise.all([
    fetchActiveSessions(),
    fetchParkingSummary().catch(() => null) // We allow summary to fail gracefully
  ]);
  return { sessions, summary };
}

export function useActiveSessions() {
  const { data, error, isLoading, mutate } = useSWR(
    "active-sessions",
    fetchSessionsData,
    {
      refreshInterval: 5000, // Polling to simulate real-time updates
      revalidateOnFocus: true,
      errorRetryCount: 3
    }
  );

  return {
    rows: data?.sessions ?? [],
    summary: data?.summary ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    reload: mutate
  };
}
