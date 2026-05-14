export function getPrintAgentBaseUrl(): string {
  return (process.env.PRINT_AGENT_URL ?? "http://127.0.0.1:9231").replace(/\/$/, "");
}

export function getPrintAgentRequestHeaders(): Headers {
  const h = new Headers();
  h.set("Accept", "application/json");
  const key = process.env.PRINT_AGENT_API_KEY?.trim();
  if (key) {
    h.set("X-API-Key", key);
  }
  return h;
}

export async function forwardToPrintAgent(
  method: "GET" | "POST",
  path: string,
  init?: { body?: string; contentType?: string; timeoutMs?: number }
): Promise<Response> {
  const base = getPrintAgentBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const { signal, cleanup } = createTimeoutSignal(init?.timeoutMs ?? 12_000);
  try {
    return await fetch(url, {
      method,
      headers: (() => {
        const h = getPrintAgentRequestHeaders();
        if (init?.contentType) {
          h.set("Content-Type", init.contentType);
        } else if (init?.body) {
          h.set("Content-Type", "application/json");
        }
        return h;
      })(),
      body: method === "POST" ? init?.body : undefined,
      cache: "no-store",
      signal
    });
  } finally {
    cleanup();
  }
}

function createTimeoutSignal(ms: number): { signal: AbortSignal; cleanup: () => void } {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, cleanup: () => clearTimeout(t) };
}
