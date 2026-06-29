import { withCsrfHeader } from "@/lib/api/csrf";

export async function fetchWithCredentials(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = withCsrfHeader(init, init?.headers as Record<string, string> | undefined);
  return fetch(input, { credentials: 'include', ...init, headers });
}