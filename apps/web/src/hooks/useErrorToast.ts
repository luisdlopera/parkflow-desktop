"use client";

import { useCallback } from "react";
import { errorService, type IErrorService } from "@/lib/errors/error-service";
import type { ParkFlowError, ToastOptions } from "@/lib/errors/types";

export function useErrorToast(): Pick<
  IErrorService["toast"],
  "error" | "success" | "warning" | "info"
> & {
  handleError: (error: unknown, options?: ToastOptions) => ParkFlowError;
  normalize: (error: unknown) => ParkFlowError;
  getFormErrors: (error: unknown) => Record<string, string>;
} {
  const handleError = useCallback(
    (error: unknown, options?: ToastOptions) => {
      return errorService.toast.error(error, options);
    },
    [],
  );

  const normalize = useCallback(
    (error: unknown) => errorService.normalize(error),
    [],
  );

  const getFormErrors = useCallback(
    (error: unknown) => errorService.getFormErrors(error),
    [],
  );

  return {
    error: errorService.toast.error.bind(errorService.toast),
    success: errorService.toast.success.bind(errorService.toast),
    warning: errorService.toast.warning.bind(errorService.toast),
    info: errorService.toast.info.bind(errorService.toast),
    handleError,
    normalize,
    getFormErrors,
  };
}