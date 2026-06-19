import { isLocalFirstMode } from "./config";
import { handleAuthRoutes } from "./local-auth-handlers";
import { handleOperationsRoutes } from "./local-operations-handlers";
import { handleCashRoutes } from "./local-cash-handlers";
import { handleOnboardingRoutes } from "./local-onboarding-handlers";

export async function handleLocalFirstFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response | null> {
  const urlStr = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const method = init?.method?.toUpperCase() ?? "GET";

  let pathname = "";
  let searchParams = new URLSearchParams();
  try {
    const parsed = new URL(urlStr, typeof window !== "undefined" ? window.location.origin : undefined);
    pathname = parsed.pathname;
    searchParams = parsed.searchParams;
  } catch {
    const qIndex = urlStr.indexOf("?");
    pathname = qIndex === -1 ? urlStr : urlStr.substring(0, qIndex);
    if (qIndex !== -1) searchParams = new URLSearchParams(urlStr.substring(qIndex + 1));
  }

  if (!pathname.includes("/api/v1/")) return null;
  if (!(await isLocalFirstMode())) return null;

  const { invoke } = await import("@tauri-apps/api/core");

  const getBody = (): Record<string, unknown> => {
    if (!init?.body) return {};
    try { return JSON.parse(String(init.body)); } catch { return {}; }
  };

  const handlers = [
    handleAuthRoutes,
    (path: string, meth: string, getBodyFn: () => Record<string, unknown>, inv: typeof invoke) => handleOperationsRoutes(path, meth, searchParams, getBodyFn, inv),
    (path: string, meth: string, getBodyFn: () => Record<string, unknown>, inv: typeof invoke) => handleCashRoutes(path, meth, searchParams, getBodyFn, inv),
    handleOnboardingRoutes
  ];

  try {
    for (const handler of handlers) {
      const result = await handler(pathname, method, getBody, invoke);
      if (result) return result as Response;
    }
  } catch (err) {
    console.error("Local first interceptor error matching path:", pathname, err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Settings / Configuration endpoints not available in local-first mode
  const settingsPatterns = [
    /^\/api\/v1\/(?:settings|configuration)\b/,
    /^\/api\/v1\/(?:monthly-contracts|agreements|prepaid)\b/
  ];
  const isSettingsEndpoint = settingsPatterns.some(pattern => pattern.test(pathname));

  if (isSettingsEndpoint) {
    return new Response(
      JSON.stringify({
        code: "OFFLINE_NOT_SUPPORTED",
        userMessage: "Esta funcion no esta disponible en modo offline. Conecte el servidor para acceder a configuraciones avanzadas.",
        developerMessage: `Endpoint ${pathname} not implemented in local-first mode`,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  return null;
}
