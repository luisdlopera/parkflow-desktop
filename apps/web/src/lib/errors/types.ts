export type ErrorSeverity = "error" | "warning" | "info";

export type ErrorAction =
  | { kind: "retry" }
  | { kind: "redirect"; url: string }
  | { kind: "login" }
  | { kind: "dismiss" }
  | { kind: "report" };

export interface ParkFlowError {
  code: string;
  title: string;
  message: string;
  description?: string;
  severity: ErrorSeverity;
  retryable: boolean;
  correlationId?: string;
  fieldErrors?: Record<string, string>;
  action?: ErrorAction;
  technical: {
    type: string;
    status?: number;
    originalType?: string;
    stack?: string;
    endpoint?: string;
    payload?: Record<string, unknown>;
    userId?: string;
    timestamp: string;
  };
}

export type ToastOptions = {
  variant?: "success" | "danger" | "warning" | "info";
  title?: string;
  duration?: number;
  action?: ErrorAction;
};

export const ErrorCodes = {
  // Auth
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",
  ACCESS_DENIED: "ACCESS_DENIED",
  AUTH_REFRESH_FAILED: "AUTH_REFRESH_FAILED",
  AUTH_DEVICE_LOCKED: "AUTH_DEVICE_LOCKED",

  // Network
  NETWORK_ERROR: "NETWORK_ERROR",
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",
  NETWORK_OFFLINE: "NETWORK_OFFLINE",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  FIELD_ERROR: "FIELD_ERROR",

  // Business
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
  DUPLICATE_ENTITY: "DUPLICATE_ENTITY",
  OPERATION_ERROR: "OPERATION_ERROR",
  PRINT_ERROR: "PRINT_ERROR",
  CASH_OPERATION_FAILED: "CASH_OPERATION_FAILED",

  // Offline / Sync
  SYNC_ERROR: "SYNC_ERROR",
  OFFLINE_NOT_SUPPORTED: "OFFLINE_NOT_SUPPORTED",
  LOCAL_STORAGE_FULL: "LOCAL_STORAGE_FULL",

  // Desktop
  TAURI_COMMAND_ERROR: "TAURI_COMMAND_ERROR",
  SQLITE_ERROR: "SQLITE_ERROR",
  PRINTER_UNAVAILABLE: "PRINTER_UNAVAILABLE",
  DESKTOP_LICENSE_ERROR: "DESKTOP_LICENSE_ERROR",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  BAD_GATEWAY: "BAD_GATEWAY",

  // Unknown
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];