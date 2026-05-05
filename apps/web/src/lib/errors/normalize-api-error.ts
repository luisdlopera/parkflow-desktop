import { ApiError, ApiErrorDetail } from "./api-error";
import { ErrorCode } from "./error-codes";

export async function normalizeApiError(response: Response): Promise<ApiError> {
  console.log(`[normalizeApiError] Normalizing error for ${response.url} (Status: ${response.status})`);
  
  let body: any = {};
  let rawText = "";
  try {
    rawText = await response.text();
    console.log(`[normalizeApiError] Raw text from server:`, rawText);
    
    if (rawText) {
      body = JSON.parse(rawText);
      console.log(`[normalizeApiError] Parsed JSON body:`, body);
    }
  } catch (e) {
    console.error(`[normalizeApiError] Could not parse response as JSON:`, e);
  }

  const status = response.status;
  const code = body?.code || (status === 401 ? ErrorCode.AUTH_SESSION_EXPIRED : status === 403 ? ErrorCode.ACCESS_DENIED : ErrorCode.UNKNOWN_ERROR);
  const message = body?.message || `Error del servidor (${status})`;
  const path = body?.path || response.url;
  const correlationId = body?.correlationId;
  
  let details: ApiErrorDetail[] | undefined;
  if (body?.details?.fields) {
    details = body.details.fields;
  } else if (body?.details) {
    details = body.details;
  }

  const error = new ApiError(status, code, message, path, correlationId, details);
  console.log(`[normalizeApiError] Final ApiError created:`, error);
  return error;
}

export function handleNetworkError(error: any): ApiError {
  console.error("[Network Error]", error);
  return new ApiError(
    0,
    ErrorCode.NETWORK_ERROR,
    "No se pudo conectar con el servidor. Verifica tu conexión a internet.",
    undefined,
    undefined,
    { originalError: error.message }
  );
}
