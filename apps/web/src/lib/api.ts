import { authHeaders, type AuthHeaderOptions } from "@/lib/auth";

export type { AuthHeaderOptions };

export async function buildApiHeaders(options?: AuthHeaderOptions): Promise<HeadersInit> {
  return authHeaders(options);
}
