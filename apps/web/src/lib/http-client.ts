import { normalizeApiError, handleNetworkError } from "@/lib/errors/normalize-api-error";

export async function httpRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(input, init);

    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }

    if (!response.ok) {
      throw await normalizeApiError(response);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "ApiError") throw error;
    throw handleNetworkError(error);
  }
}
