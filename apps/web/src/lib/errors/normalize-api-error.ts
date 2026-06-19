import { ApiError, ApiErrorDetail } from "./api-error";
import { ErrorCode } from "./error-codes";

export async function normalizeApiError(response: Response): Promise<ApiError> {
  let body: unknown = {};
  try {
    const rawText = await response.text();
    if (rawText) body = JSON.parse(rawText) as unknown;
  } catch {
    // no-op: fallback mapping below
  }

  const isObject = typeof body === "object" && body !== null;
  const bodyObj = isObject ? (body as Record<string, unknown>) : {};

  const status = response.status;
  const code =
    typeof bodyObj.errorCode === "string" ? bodyObj.errorCode :
    typeof bodyObj.code === "string" ? bodyObj.code :
    (status === 401
      ? ErrorCode.AUTH_SESSION_EXPIRED
      : status === 403
        ? ErrorCode.ACCESS_DENIED
        : ErrorCode.UNKNOWN_ERROR);

  const message =
    typeof bodyObj.userMessage === "string" ? bodyObj.userMessage :
    typeof bodyObj.message === "string" ? bodyObj.message :
    (status === 409
      ? "Conflicto con los datos actuales. Es posible que el registro ya exista o haya sido modificado."
      : status === 403
        ? "No tienes permisos para realizar esta accion."
        : status === 401
          ? "Tu sesión ha expirado o credenciales incorrectas."
          : status === 404
            ? "El recurso solicitado no existe o fue eliminado."
            : status === 400
              ? "Datos inválidos o incompletos. Por favor, revisa la información ingresada."
              : `No pudimos completar tu solicitud (${status}).`);

  const path = typeof bodyObj.path === "string" ? bodyObj.path : response.url;
  const correlationId = typeof bodyObj.correlationId === "string" ? bodyObj.correlationId : undefined;
  const developerMessage = typeof bodyObj.developerMessage === "string" ? bodyObj.developerMessage : undefined;

  let details: ApiErrorDetail[] | Record<string, unknown> | undefined;
  const detailsObj = bodyObj.details;
  if (typeof detailsObj === "object" && detailsObj !== null) {
    const d = detailsObj as Record<string, unknown>;
    if (Array.isArray(d.fields)) {
      details = d.fields as ApiErrorDetail[];
    } else {
      details = d;
    }
  }

  return new ApiError(status, code, message, path, correlationId, details, developerMessage);
}

function isTauriDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function handleNetworkError(error: unknown): ApiError {
  const isDesktop = isTauriDesktop();
  const message = isDesktop
    ? "Servidor local no disponible. Algunas funciones de configuracion requieren conexion al servidor."
    : "Sin conexion. Verifica internet o la red local e intenta nuevamente.";

  const errMessage = error instanceof Error ? error.message : String(error);

  return new ApiError(
    0,
    ErrorCode.NETWORK_ERROR,
    message,
    undefined,
    undefined,
    { originalError: errMessage, isDesktop }
  );
}
