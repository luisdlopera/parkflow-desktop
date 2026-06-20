import { useState, useEffect } from 'react';
import { SearchResponse } from '../types/search.types';
import { httpRequest } from '@/lib/http-client';
import { authHeaders } from "@/features/auth/services/auth-domain.service";
import { apiBase } from '@/lib/api/config';

function apiBaseUrl() {
  return apiBase();
}

export function useSearch(query: string, scope?: string) {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = new URL(`${apiBaseUrl()}/search`);
        url.searchParams.append('q', query.trim());
        if (scope) url.searchParams.append('scope', scope);

        const data = await httpRequest<SearchResponse>(url.toString(), {
          headers: await authHeaders(),
        });
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, scope]);

  return { results, isLoading, error };
}
