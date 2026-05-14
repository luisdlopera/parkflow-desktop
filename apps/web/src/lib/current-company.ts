import { listCompanies } from "@/lib/licensing/api";

const STORAGE_KEY = "parkflow.current_company_id";

export async function resolveCurrentCompanyId(): Promise<string | null> {
  const companies = await listCompanies();
  if (companies.length === 0) return null;
  if (typeof window === "undefined") return companies[0].id;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  const exists = saved ? companies.some((c) => c.id === saved) : false;
  const selected = exists ? saved! : companies[0].id;
  window.localStorage.setItem(STORAGE_KEY, selected);
  return selected;
}
