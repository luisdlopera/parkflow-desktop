import { ApiError } from "./api-error";
import { ErrorCode } from "./error-codes";
import {
  CONTEXT_ERROR_MESSAGES,
  GLOBAL_ERROR_MESSAGES,
  type UserFriendlyError,
} from "./error-messages";

const DEFAULT_ERROR: UserFriendlyError = {
  title: "Ocurrió un error inesperado",
  description: "No pudimos identificar el problema. Intenta nuevamente.",
  actionLabel: "Reintentar",
  severity: "error",
};

function isCleanMessage(message?: string): boolean {
  if (!message) return false;
  const normalized = message.trim().toLowerCase();
  return !!normalized && !normalized.includes("status code") && !normalized.includes("unexpected token");
}

function statusFallback(status?: number): UserFriendlyError | undefined {
  switch (status) {
    case 400:
    case 422:
      return GLOBAL_ERROR_MESSAGES.VALIDATION_ERROR;
    case 401:
      return GLOBAL_ERROR_MESSAGES.AUTH_SESSION_EXPIRED;
    case 403:
      return GLOBAL_ERROR_MESSAGES.ACCESS_DENIED;
    case 404:
      return GLOBAL_ERROR_MESSAGES.RESOURCE_NOT_FOUND;
    case 409:
      return GLOBAL_ERROR_MESSAGES.RESOURCE_CONFLICT;
    case 500:
      return GLOBAL_ERROR_MESSAGES.INTERNAL_ERROR;
    default:
      return undefined;
  }
}

const ALWAYS_GLOBAL_CODES = new Set<string>([
  ErrorCode.AUTH_INVALID_CREDENTIALS,
  ErrorCode.AUTH_SESSION_EXPIRED,
  ErrorCode.ACCESS_DENIED,
  ErrorCode.NETWORK_ERROR,
  ErrorCode.NETWORK_TIMEOUT,
  ErrorCode.NETWORK_OFFLINE,
  ErrorCode.VALIDATION_ERROR,
  ErrorCode.RESOURCE_NOT_FOUND,
  ErrorCode.RESOURCE_CONFLICT,
  ErrorCode.INTERNAL_ERROR,
  ErrorCode.SERVICE_UNAVAILABLE,
  ErrorCode.UNKNOWN_ERROR,
]);

function resolveContext(context: string | undefined, code?: string): UserFriendlyError | undefined {
  if (!context) return undefined;
  const ctx = CONTEXT_ERROR_MESSAGES[context];
  if (!ctx) return undefined;
  if (code && ctx[code]) return ctx[code];
  return ctx.fallback;
}

function toUserFriendlyError(error: unknown, context?: string): UserFriendlyError {
  if (error instanceof ApiError) {
    const contextMsg = resolveContext(context, error.code);
    if (contextMsg) return contextMsg;

    if ((!context || (error.code && ALWAYS_GLOBAL_CODES.has(error.code))) && error.code) {
      const globalMsg = GLOBAL_ERROR_MESSAGES[error.code as keyof typeof GLOBAL_ERROR_MESSAGES];
      if (globalMsg) return globalMsg;
    }

    if (!error.code) {
      const fallback = statusFallback(error.status);
      if (fallback) return fallback;
    }

    if (isCleanMessage(error.message)) {
      return {
        ...DEFAULT_ERROR,
        description: error.message.trim(),
      };
    }

    return DEFAULT_ERROR;
  }

  if (error instanceof Error) {
    const typed = error as Error & { code?: string; status?: number };
    const contextMsg = resolveContext(context, typed.code);
    if (contextMsg) return contextMsg;

    if ((!context || (typed.code && ALWAYS_GLOBAL_CODES.has(typed.code))) && typed.code) {
      const globalMsg = GLOBAL_ERROR_MESSAGES[typed.code as keyof typeof GLOBAL_ERROR_MESSAGES];
      if (globalMsg) return globalMsg;
    }

    const fallback = statusFallback(typed.status);
    if (fallback) return fallback;

    if (isCleanMessage(typed.message)) {
      return {
        ...DEFAULT_ERROR,
        title: DEFAULT_ERROR.title,
        description: typed.message.trim(),
      };
    }
  }

  if (typeof error === "string") {
    const text = error.trim();
    if (text) {
      return {
        ...DEFAULT_ERROR,
        description: text,
      };
    }
  }

  const contextMsg = resolveContext(context);
  if (contextMsg) return contextMsg;

  return DEFAULT_ERROR;
}

export function getUserErrorMessage(error: unknown, context?: string): UserFriendlyError {
  const friendly = toUserFriendlyError(error, context);
  return {
    title: friendly.title,
    description: friendly.description,
    severity: friendly.severity,
    actionLabel: friendly.actionLabel || "Reintentar",
  };
}
