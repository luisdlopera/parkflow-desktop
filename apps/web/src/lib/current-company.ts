import { currentUser } from "@/lib/services/auth-domain.service";

export async function resolveCurrentCompanyId(): Promise<string | null> {
  const user = await currentUser();
  return user?.companyId ?? null;
}
