import { ApiError, ApiErrorDetail } from "./api-error";
import { ErrorCode } from "./error-codes";

export async function normalizeApiError(response: Response): Promise<ApiError> {
  let body: any = {};
  try {
    const rawText = await response.text();
    if (rawText) body = JSON.parse(rawText);
  } catch {
    // no-op: fallback mapping below
  }

  const status = response.status;
  const code =
    body?.errorCode ||
    body?.code ||
    (status === 401
      ? ErrorCode.AUTH_SESSION_EXPIRED
      : status === 403
        ? ErrorCode.ACCESS_DENIED
        : ErrorCode.UNKNOWN_ERROR);

  const message =
    body?.userMessage ||
    body?.message ||
    (status === 403
      ? "No tienes permisos para realizar esta accion."
      : `No pudimos completar tu solicitud (${status}).`);

  const path = body?.path || response.url;
  const correlationId = body?.correlationId;

  let details: ApiErrorDetail[] | Record<string, any> | undefined;
  if (Array.isArray(body?.details?.fields)) details = body.details.fields;
  else if (body?.details) details = body.details;

  return new ApiError(status, code, message, path, correlationId, details, body?.developerMessage);
}

export function handleNetworkError(error: any): ApiError {
  return new ApiError(
    0,
    ErrorCode.NETWORK_ERROR,
    "Sin conexion. Verifica internet o la red local e intenta nuevamente.",
    undefined,
    undefined,
    { originalError: error?.message ?? String(error) }
  );
}
