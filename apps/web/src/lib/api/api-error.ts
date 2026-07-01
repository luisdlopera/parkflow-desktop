import { ApiError } from "@/lib/errors/ApiError";
import { errorService } from "@/lib/errors/error-service";

export function throwApiError(
  message: string,
  context?: {
    endpoint?: string;
    payload?: Record<string, unknown>;
    code?: string;
    status?: number;
    correlationId?: string;
    details?: unknown;
    developerMessage?: string;
  }
): never {
  throw new ApiError(
    message,
    {
      status: context?.status ?? 400,
      code: context?.code ?? "OPERATION_ERROR",
      path: context?.endpoint,
      correlationId: context?.correlationId,
      details: context?.details,
      payload: context?.payload,
      developerMessage: context?.developerMessage,
    }
  );
}

export function normalizeApiError(
  error: unknown,
  context?: { endpoint?: string; payload?: Record<string, unknown> }
) {
  return errorService.normalize(error, context);
}
