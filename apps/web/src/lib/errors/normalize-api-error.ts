import { ApiError } from "./api-error";
import { ErrorCode } from "./error-codes";

const STATUS_MESSAGES: Record<number, string> = {
  400: "Datos inválidos. Revisa la información ingresada.",
  401: "Sesión expirada. Inicia sesión nuevamente.",
  403: "No tienes permisos para realizar esta acción.",
  404: "El recurso solicitado no existe o fue eliminado.",
  409: "Conflicto de datos. El registro ya existe o fue modificado por otro usuario.",
  422: "Datos inválidos. Revisa los campos marcados.",
  500: "No pudimos procesar tu solicitud. Intenta nuevamente.",
  502: "El servidor respondió con un error temporal.",
  503: "El servicio está temporalmente fuera de línea.",
  429: "Demasiados intentos. Intenta más tarde.",
};

function statusToCode(status: number): string {
  switch (status) {
    case 401: return ErrorCode.AUTH_SESSION_EXPIRED;
    case 403: return ErrorCode.ACCESS_DENIED;
    case 404: return ErrorCode.RESOURCE_NOT_FOUND;
    case 409: return ErrorCode.RESOURCE_CONFLICT;
    case 422: return ErrorCode.VALIDATION_ERROR;
    default: return ErrorCode.UNKNOWN_ERROR;
  }
}

function getDefaultMessage(status: number): string {
  return STATUS_MESSAGES[status] || `No pudimos procesar la respuesta del servidor (${status}).`;
}

async function parseResponseBody(response: Response): Promise<Record<string, unknown>> {
  if (typeof response.text !== "function") {
    if (typeof response.json === "function") {
      try {
        const body = await response.json();
        return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    }
    const rawBody = (response as any).body || (response as any)._body;
    if (rawBody) {
      if (typeof rawBody === "object") return rawBody;
      try { return JSON.parse(rawBody) as Record<string, unknown>; } catch { return { message: rawBody }; }
    }
    return {};
  }

  const responseObj = typeof response.clone === "function" ? response.clone() : response;

  try {
    const text = await responseObj.text();
    if (!text.trim()) return {};
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    if (typeof responseObj.json === "function") {
      try {
        const body = await responseObj.json();
        return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
      } catch {
        // ignore
      }
    }
    try {
      const text = await responseObj.text();
      if (text.trim()) {
        return { message: text };
      }
    } catch {
      // ignore
    }
    return {};
  }
}

function normalizeDetails(details: unknown): unknown {
  if (!details || typeof details !== "object") return details;
  const obj = details as Record<string, unknown>;
  if (Array.isArray(obj.fields)) return obj.fields;
  return details;
}

export async function normalizeApiError(response: Response): Promise<ApiError> {
  const body = await parseResponseBody(response);
  const nestedError = typeof body.error === "object" && body.error !== null
    ? (body.error as Record<string, unknown>)
    : undefined;
  const status = response.status;
  const code = typeof nestedError?.errorCode === "string"
    ? nestedError.errorCode
    : typeof nestedError?.code === "string"
      ? nestedError.code
      : typeof body.errorCode === "string"
        ? body.errorCode
        : typeof body.code === "string"
          ? body.code
      : statusToCode(status);
  const message = typeof nestedError?.userMessage === "string"
    ? nestedError.userMessage
    : typeof nestedError?.message === "string"
      ? nestedError.message
      : typeof body.userMessage === "string"
        ? body.userMessage
        : typeof body.message === "string"
          ? body.message
          : typeof body.error === "string"
            ? body.error
      : getDefaultMessage(status);
  const path = typeof nestedError?.path === "string"
    ? nestedError.path
    : typeof body.path === "string"
    ? body.path
    : (() => {
        try {
          return new URL(response.url).pathname;
        } catch {
          return undefined;
        }
      })();
  const correlationId = typeof nestedError?.correlationId === "string"
    ? nestedError.correlationId
    : typeof nestedError?.traceId === "string"
      ? nestedError.traceId
      : typeof body.correlationId === "string"
        ? body.correlationId
        : typeof body.traceId === "string"
          ? body.traceId
      : undefined;
  const developerMessage = typeof nestedError?.developerMessage === "string"
    ? nestedError.developerMessage
    : typeof body.developerMessage === "string"
      ? body.developerMessage
      : typeof body.message === "string" && body.message !== message
        ? body.message
      : undefined;
  const details = nestedError?.issues || nestedError?.details || body.details || body.errors || body.issues || nestedError?.validationIssues || body.validationIssues;
  const normalizedDetails = normalizeDetails(details);

  return new ApiError(status, code, message, path, correlationId, normalizedDetails, developerMessage);
}

export function handleNetworkError(error: unknown): ApiError {
  const original = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : error == null
        ? "Unknown network error"
        : JSON.stringify(error);

  const win = typeof window !== "undefined" ? window : (typeof global !== "undefined" && (global as any).window ? (global as any).window : undefined);
  const isDesktop = !!(win && "__TAURI_INTERNALS__" in win);

  const isDeveloperError = original.toLowerCase().includes("json") || 
                           original.toLowerCase().includes("syntax") || 
                           original.toLowerCase().includes("typeerror") || 
                           original.toLowerCase().includes("referenceerror");

  const message = isDeveloperError
    ? original
    : (isDesktop
        ? "Servidor local no disponible. Intente más tarde."
        : "Sin conexion al servidor. Verifica tu conexión.");

  return new ApiError(
    0,
    ErrorCode.NETWORK_ERROR,
    message,
    undefined,
    undefined,
    { originalError: original, isDesktop },
    original,
  );
}
