import { apiFetch, apiV1Base, buildApiHeaders, hdr } from "./_shared";

export type ThemeMode = "light" | "dark" | "auto";

export type ThemeConfig = {
  id: string | null;
  companyId: string;
  primaryColor: string;
  secondaryColor: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  themeMode: ThemeMode;
  logoUrl: string | null;
  faviconUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ThemeColorPayload = Omit<
  ThemeConfig,
  "id" | "companyId" | "logoUrl" | "faviconUrl" | "createdAt" | "updatedAt"
>;

function themeCfgBase(): string {
  return `${apiV1Base()}/configuration/theme`;
}

export async function fetchThemeConfig(companyId: string): Promise<ThemeConfig> {
  return apiFetch<ThemeConfig>(
    `${themeCfgBase()}?companyId=${encodeURIComponent(companyId)}`,
    {
      cache: "no-store",
      headers: await buildApiHeaders(),
    },
  );
}

export async function saveThemeConfig(
  companyId: string,
  data: ThemeColorPayload,
): Promise<ThemeConfig> {
  const base = await buildApiHeaders(hdr("Actualización de tema"));
  return apiFetch<ThemeConfig>(
    `${themeCfgBase()}?companyId=${encodeURIComponent(companyId)}`,
    {
      method: "PUT",
      headers: { ...(base as Record<string, string>), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
}

export async function uploadThemeLogo(companyId: string, file: File): Promise<ThemeConfig> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ThemeConfig>(
    `${themeCfgBase()}/logo?companyId=${encodeURIComponent(companyId)}`,
    {
      method: "POST",
      headers: await buildApiHeaders(),
      body: form,
    },
  );
}

export async function removeThemeLogo(companyId: string): Promise<ThemeConfig> {
  return apiFetch<ThemeConfig>(
    `${themeCfgBase()}/logo?companyId=${encodeURIComponent(companyId)}`,
    {
      method: "DELETE",
      headers: await buildApiHeaders(),
    },
  );
}

export async function uploadThemeFavicon(
  companyId: string,
  file: File,
): Promise<ThemeConfig> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ThemeConfig>(
    `${themeCfgBase()}/favicon?companyId=${encodeURIComponent(companyId)}`,
    {
      method: "POST",
      headers: await buildApiHeaders(),
      body: form,
    },
  );
}

export async function removeThemeFavicon(companyId: string): Promise<ThemeConfig> {
  return apiFetch<ThemeConfig>(
    `${themeCfgBase()}/favicon?companyId=${encodeURIComponent(companyId)}`,
    {
      method: "DELETE",
      headers: await buildApiHeaders(),
    },
  );
}
