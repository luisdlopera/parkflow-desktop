import { loadSession } from "@/features/auth/services/auth-storage.service";
import { extractCompanyIdFromToken } from "@/features/auth/services/auth-domain.service";
export async function resolveCurrentCompanyId(): Promise<string | null> {
  const session = await loadSession();
  if (!session) return null;

  // 1. Intentar usar el companyId del usuario logueado (funciona para ADMIN, CAJERO, etc.)
  const userCompanyId = session.user?.companyId;
  if (userCompanyId) {
    return userCompanyId;
  }

  // 2. Fallback: extraer companyId del token JWT claim "cid"
  const tokenCompanyId = extractCompanyIdFromToken(session.accessToken);
  if (tokenCompanyId) {
    return tokenCompanyId;
  }

  // 3. No hay más fallbacks por seguridad — si no se puede determinar el tenant,
  //    se retorna null para que el componente decida cómo manejarlo
  return null;
}
