"use client";

import { useState, useCallback } from "react";
import { toast } from "@heroui/react";
import { getUserFriendlyErrorMessage, FrontendActionError } from "./error-messages";

interface UseAsyncActionOptions<T> {
  /** Mensaje de toast en éxito. Si se omite no muestra toast de éxito. */
  successMsg?: string;
  /** Contexto para el mensaje de error amigable. Default: UNKNOWN. */
  errorContext?: FrontendActionError;
  /** Callback adicional tras éxito. */
  onSuccess?: (result: T) => void;
  /** Si false, no muestra toast de error (útil para mostrar el error inline). Default: true. */
  showErrorToast?: boolean;
}

interface UseAsyncActionReturn<T> {
  /** Ejecuta la acción y gestiona loading/error/toast automáticamente. */
  run: (action: () => Promise<T>) => Promise<T | undefined>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Encapsula el patrón repetido de: setLoading → try/catch → toast → setError.
 *
 * Uso:
 *   const { run, isLoading, error } = useAsyncAction({ successMsg: "Guardado", errorContext: FrontendActionError.SAVE_DATA });
 *   const onSubmit = (values) => run(() => createPaymentMethod(values));
 */
export function useAsyncAction<T = void>(
  opts: UseAsyncActionOptions<T> = {}
): UseAsyncActionReturn<T> {
  const {
    successMsg,
    errorContext = FrontendActionError.UNKNOWN,
    onSuccess,
    showErrorToast = true,
  } = opts;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<T>): Promise<T | undefined> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await action();
        if (successMsg) toast.success(successMsg);
        onSuccess?.(result);
        return result;
      } catch (e) {
        const msg = getUserFriendlyErrorMessage(e, errorContext);
        setError(msg);
        if (showErrorToast) toast.danger(msg);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [successMsg, errorContext, onSuccess, showErrorToast]
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, isLoading, error, clearError };
}
