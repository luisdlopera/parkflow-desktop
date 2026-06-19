import { authHeaders } from "@/features/auth/services/auth-domain.service";
import type { AuthHeaderOptions } from "@/features/auth/types";
export type { AuthHeaderOptions };

export async function buildApiHeaders(options?: AuthHeaderOptions): Promise<HeadersInit> {
  return authHeaders(options);
}
