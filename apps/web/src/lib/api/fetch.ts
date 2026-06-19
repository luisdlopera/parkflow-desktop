import { normalizeApiError, handleNetworkError } from "@/lib/errors/normalize-api-error";

export async function safeFetch<T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  try {
    // Prefer an app-provided wrapper if present (set by Providers), otherwise fall back to native fetch.
    // This prevents overriding global fetch which breaks testing tooling and Tauri.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const wrapper = typeof window !== "undefined" ? (window.__parkflowFetchWrapper as typeof fetch | undefined) : undefined;
    const fetcher =
      typeof window !== "undefined"
        ? wrapper ?? (window.__parkflowNativeFetch ?? window.fetch.bind(window))
        : fetch;
    const res = await fetcher(input as any, init as any);
    if (!res.ok) throw await normalizeApiError(res);
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "ApiError") throw err;
    throw handleNetworkError(err);
  }
}

export default safeFetch;
