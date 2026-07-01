import { authBase } from "@/lib/api/config";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";

export async function refreshAuthTokens(): Promise<boolean> {
  try {
    const response = await fetchWithCredentials(`${authBase()}/refresh-token`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}
