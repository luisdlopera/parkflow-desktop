import { listCompanies } from "@/lib/licensing/api";
import { loadSession, extractCompanyIdFromToken } from "@/lib/auth";

const STORAGE_KEY = "parkflow.current_company_id";

export async function resolveCurrentCompanyId(): Promise<string | null> {
  const session = await loadSession();
  if (!session) return null;

  // 1. Intentar usar el companyId del usuario logueado (funciona para ADMIN, CAJERO, etc.)
  const userCompanyId = session.user?.companyId;
  if (userCompanyId) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, userCompanyId);
    }
    return userCompanyId;
  }

  // 2. Fallback: extraer companyId del token JWT claim "cid"
  const tokenCompanyId = extractCompanyIdFromToken(session.accessToken);
  if (tokenCompanyId) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, tokenCompanyId);
    }
    return tokenCompanyId;
  }

  // 3. Fallback: usar listCompanies() (requiere SUPER_ADMIN, puede fallar para otros roles)
  try {
    const companies = await listCompanies();
    if (companies.length === 0) return null;
    if (typeof window === "undefined") return companies[0].id;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const exists = saved ? companies.some((c) => c.id === saved) : false;
    const selected = exists ? saved! : companies[0].id;
    window.localStorage.setItem(STORAGE_KEY, selected);
    return selected;
  } catch {
    // 4. Último fallback: usar lo guardado en localStorage
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    }
    return null;
  }
}
