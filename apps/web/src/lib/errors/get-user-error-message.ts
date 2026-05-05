import { ApiError } from "./api-error";
import { ErrorCode } from "./error-codes";
import { CONTEXT_ERROR_MESSAGES, GLOBAL_ERROR_MESSAGES, UserFriendlyError } from "./error-messages";

export function getUserErrorMessage(
  error: unknown,
  context?: string
): UserFriendlyError {
  // 1. Normalize error to ApiError if it isn't already
  let apiError: ApiError;
  
  if (error instanceof ApiError) {
    apiError = error;
  } else if (error instanceof Error) {
    apiError = new ApiError(500, ErrorCode.UNKNOWN_ERROR, error.message);
  } else {
    apiError = new ApiError(500, ErrorCode.UNKNOWN_ERROR, String(error));
  }

  const code = apiError.code as string;

  // 2. Try to find a context-specific message
  if (context && CONTEXT_ERROR_MESSAGES[context]) {
    const contextMap = CONTEXT_ERROR_MESSAGES[context];
    if (contextMap[code]) {
      const { severity = "error", actionLabel = "Reintentar", ...rest } = contextMap[code] as UserFriendlyError;
      return { severity, actionLabel, ...rest };
    }
    // Context fallback
    if (contextMap.fallback) {
      const { severity = "error", actionLabel = "Reintentar", ...rest } = contextMap.fallback as UserFriendlyError;
      return { severity, actionLabel, ...rest };
    }
  }

  // 3. Try to find a global message by error code
  if (GLOBAL_ERROR_MESSAGES[code]) {
    const { severity = "error", actionLabel = "Reintentar", ...rest } = GLOBAL_ERROR_MESSAGES[code] as UserFriendlyError;
    return { severity, actionLabel, ...rest };
  }

  // 4. Default fallback
  return {
    title: "Ocurrió un error inesperado",
    description: apiError.message || "No pudimos completar la operación. Intenta nuevamente.",
    actionLabel: "Reintentar",
    severity: "error",
  };
}
