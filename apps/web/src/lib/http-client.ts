import safeFetch from "./api/fetch";

export async function httpRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  return safeFetch<T>(input, init);
}
