export async function fetchWithCredentials(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { credentials: 'include', ...init });
}