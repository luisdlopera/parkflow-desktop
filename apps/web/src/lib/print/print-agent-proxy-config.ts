/**
 * Cliente: usa el proxy de Next.js (`/api/print-agent/*`) para no enviar
 * `PRINT_AGENT_API_KEY` al navegador. Solo con `NEXT_PUBLIC_PRINT_AGENT_DIRECT=true`
 * se llama al agente con URL pública (menos seguro, solo diagnóstico).
 */
export function isPrintAgentProxyPath(): boolean {
  return (process.env.NEXT_PUBLIC_PRINT_AGENT_DIRECT ?? "").trim() !== "true";
}

export function directPrintAgentBaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_PRINT_AGENT_URL?.trim() || null;
}

export function printAgentPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (isPrintAgentProxyPath()) {
    return `/api/print-agent${p}`;
  }
  const base = directPrintAgentBaseUrl();
  if (!base) {
    return "";
  }
  return `${base.replace(/\/$/, "")}${p}`;
}

export function directPrintAgentApiKey(): string | null {
  if (!isPrintAgentProxyPath()) {
    return process.env.NEXT_PUBLIC_PRINT_AGENT_API_KEY?.trim() || null;
  }
  return null;
}
