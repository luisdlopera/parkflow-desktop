/**
 * Enhanced Toast System with Animations
 * Wraps HeroUI toast for consistent, animated notifications
 * Toast animations are handled by HeroUI with slide-in from top
 */

import { toast } from "@heroui/react";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

/**
 * Show success toast
 * Provides positive feedback for successful operations
 */
export const showSuccessToast = (message: string) => {
  return toast.success(message);
};

/**
 * Show error toast
 * Alerts user to errors or failed operations
 */
export const showErrorToast = (message: string) => {
  return toast.danger(message);
};

/**
 * Show warning toast
 * Cautions user about potential issues
 */
export const showWarningToast = (message: string) => {
  return toast.warning(message);
};

/**
 * Show info toast
 * Provides informational feedback
 */
export const showInfoToast = (message: string) => {
  return toast(message);
};

/**
 * Generic animated toast handler
 * Route to appropriate variant based on type
 */
export const showAnimatedToast = (
  message: string,
  variant: ToastVariant = "default"
) => {
  switch (variant) {
    case "success":
      return showSuccessToast(message);
    case "error":
      return showErrorToast(message);
    case "warning":
      return showWarningToast(message);
    case "info":
      return showInfoToast(message);
    default:
      return toast(message);
  }
};
