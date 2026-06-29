/**
 * Centralized handler for API error responses
 * Translates backend error codes to user-friendly messages
 */

import { AxiosError } from "axios";
import { toast } from "@heroui/react";
import { translateBackendError } from "./error-translator";

export interface ApiErrorResponse {
  code?: string;
  message?: string;
  status?: number;
  data?: any;
}

/**
 * Extracts error information from an Axios error response
 */
function extractErrorData(error: AxiosError): ApiErrorResponse {
  if (!error.response) {
    return {
      code: "NETWORK_ERROR",
      message: "No hay conexión con el servidor.",
    };
  }

  const data = error.response.data as any;

  return {
    code: data?.code || `HTTP_${error.response.status}`,
    message: data?.message,
    status: error.response.status,
    data,
  };
}

/**
 * Handles API errors and displays user-friendly Toast messages
 *
 * @param error - Axios error object
 * @param customMessage - Optional custom message to override default translation
 * @param onError - Optional callback for custom error handling
 *
 * @example
 * try {
 *   await api.post('/endpoint', data);
 * } catch (error) {
 *   handleApiError(error);
 * }
 */
export function handleApiError(
  error: unknown,
  customMessage?: string,
  onError?: (errorData: ApiErrorResponse) => void
): void {
  if (!(error instanceof AxiosError)) {
    toast.error("Ocurrió un error inesperado.");
    return;
  }

  const errorData = extractErrorData(error);
  const userMessage =
    customMessage ||
    translateBackendError(errorData.code || "UNKNOWN_ERROR", errorData.data);

  // Show toast with user-friendly message
  toast.error(userMessage, { timeout: 5000 });

  // Call custom handler if provided
  if (onError) {
    onError(errorData);
  }

  // Log technical details to console for debugging (development only)
  if (process.env.NODE_ENV === "development") {
    console.error("[API Error]", {
      code: errorData.code,
      status: errorData.status,
      message: errorData.message,
      data: errorData.data,
    });
  }
}

/**
 * Handles API errors silently (no toast, useful for pre-check operations)
 * Returns the extracted error data for custom handling
 */
export function handleApiErrorSilently(error: unknown): ApiErrorResponse | null {
  if (!(error instanceof AxiosError)) {
    return null;
  }

  return extractErrorData(error);
}

/**
 * Checks if an error is a specific API error code
 *
 * @example
 * if (isApiError(error, 'VEHICLE_ALREADY_EXISTS')) {
 *   // Handle duplicate vehicle
 * }
 */
export function isApiError(
  error: unknown,
  code: string
): error is AxiosError {
  if (!(error instanceof AxiosError)) {
    return false;
  }

  const data = error.response?.data as any;
  return data?.code === code;
}
