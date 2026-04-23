import { authHeaders } from "@/lib/auth";

export async function buildApiHeaders(): Promise<HeadersInit> {
  return authHeaders();
}
