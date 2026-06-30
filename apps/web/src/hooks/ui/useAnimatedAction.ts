/**
 * useAnimatedAction Hook
 * Combines async action execution with animated toast feedback
 * Handles loading, success, and error states with animations
 */

import { useState, useCallback } from "react";
import { toast } from "@heroui/react";

interface UseAnimatedActionOptions {
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseAnimatedActionResult<T> {
  execute: (action: () => Promise<T>) => Promise<T | null>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Execute async actions with animated feedback
 * Automatically shows success/error toasts
 *
 * @example
 * const { execute, isLoading } = useAnimatedAction({
 *   successMessage: "Saved successfully!",
 *   errorMessage: "Failed to save"
 * });
 *
 * const handleSave = async () => {
 *   await execute(() => api.save(data));
 * };
 */
export function useAnimatedAction<T>(
  options: UseAnimatedActionOptions = {}
): UseAnimatedActionResult<T> {
  const {
    successMessage = "Operation successful!",
    errorMessage = "Operation failed",
    showToast = true,
    onSuccess,
    onError,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (action: () => Promise<T>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await action();
        if (showToast && successMessage) {
          toast.success(successMessage);
        }
        onSuccess?.();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        if (showToast && errorMessage) {
          toast.danger(errorMessage);
        }
        onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [errorMessage, successMessage, showToast, onSuccess, onError]
  );

  return { execute, isLoading, error };
}
