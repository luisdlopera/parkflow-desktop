import { toast } from "@heroui/react";
import { ZodError } from "zod";
import {
  type ParkFlowError,
  type ErrorSeverity,
  type ErrorAction,
  type ErrorCode,
  type ToastOptions,
  ErrorCodes,
} from "./types";

const isDesktop = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const knownHttpMessages: Record<number, { title: string; message: string }> = {
  400: { title: "Datos inválidos", message: "Revisa la información ingresada." },
  401: { title: "Sesión expirada", message: "Tu sesión ha expirado. Inicia sesión nuevamente." },
  403: { title: "Acceso denegado", message: "No tienes permisos para realizar esta acción." },
  404: { title: "No encontrado", message: "El recurso solicitado no existe o fue eliminado." },
  409: { title: "Conflicto", message: "El registro ya existe o fue modificado por otro usuario." },
  422: { title: "Datos inválidos", message: "La información enviada no es válida." },
  429: { title: "Demasiadas solicitudes", message: "Has realizado demasiadas solicitudes. Espera un momento." },
  500: { title: "Error del servidor", message: "Ocurrió un error interno. Intenta nuevamente más tarde." },
  502: { title: "Servicio no disponible", message: "El servidor no está disponible momentáneamente." },
  503: { title: "Servicio en mantenimiento", message: "El servicio está temporalmente fuera de línea." },
};

const knownErrorCodes: Record<string, { title: string; message: string; severity: ErrorSeverity; retryable: boolean; action?: ErrorAction }> = {
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: {
    title: "Credenciales incorrectas",
    message: "El correo o la contraseña no son válidos.",
    severity: "error",
    retryable: true,
  },
  [ErrorCodes.AUTH_SESSION_EXPIRED]: {
    title: "Tu sesión ha expirado",
    message: "Por seguridad, inicia sesión nuevamente.",
    severity: "error",
    retryable: false,
    action: { kind: "login" },
  },
  [ErrorCodes.ACCESS_DENIED]: {
    title: "Acceso denegado",
    message: "No tienes permisos para realizar esta acción.",
    severity: "error",
    retryable: false,
  },
  [ErrorCodes.AUTH_REFRESH_FAILED]: {
    title: "No se pudo renovar la sesión",
    message: "Ocurrió un error al renovar tu sesión. Inicia sesión nuevamente.",
    severity: "error",
    retryable: false,
    action: { kind: "login" },
  },
  [ErrorCodes.AUTH_DEVICE_LOCKED]: {
    title: "Dispositivo bloqueado",
    message: "Este dispositivo ha sido bloqueado por el administrador.",
    severity: "error",
    retryable: false,
  },
  [ErrorCodes.NETWORK_ERROR]: {
    title: "Sin conexión",
    message: isDesktop()
      ? "El servidor local no está disponible."
      : "No fue posible conectar con el servidor. Verifica tu conexión.",
    severity: "warning",
    retryable: true,
    action: { kind: "retry" },
  },
  [ErrorCodes.NETWORK_TIMEOUT]: {
    title: "Tiempo de espera agotado",
    message: "El servidor no respondió a tiempo. Verifica tu conexión.",
    severity: "warning",
    retryable: true,
    action: { kind: "retry" },
  },
  [ErrorCodes.NETWORK_OFFLINE]: {
    title: "Sin conexión a internet",
    message: "Los cambios se guardarán localmente y se sincronizarán cuando vuelva la conexión.",
    severity: "info",
    retryable: false,
  },
  [ErrorCodes.VALIDATION_ERROR]: {
    title: "Datos inválidos",
    message: "Revisa los campos marcados en el formulario.",
    severity: "error",
    retryable: true,
  },
  [ErrorCodes.RESOURCE_NOT_FOUND]: {
    title: "No encontrado",
    message: "El recurso que buscas no existe o fue eliminado.",
    severity: "error",
    retryable: false,
  },
  [ErrorCodes.RESOURCE_CONFLICT]: {
    title: "Conflicto",
    message: "El registro ya existe o fue modificado. Recarga e intenta nuevamente.",
    severity: "error",
    retryable: true,
    action: { kind: "retry" },
  },
  [ErrorCodes.DUPLICATE_ENTITY]: {
    title: "Registro duplicado",
    message: "Ya existe un registro con estos datos.",
    severity: "error",
    retryable: true,
  },
  [ErrorCodes.OPERATION_ERROR]: {
    title: "Error en la operación",
    message: "No se pudo completar la operación.",
    severity: "error",
    retryable: true,
    action: { kind: "retry" },
  },
  [ErrorCodes.PRINT_ERROR]: {
    title: "Error de impresión",
    message: "No se pudo imprimir. Verifica la impresora.",
    severity: "warning",
    retryable: true,
    action: { kind: "retry" },
  },
  [ErrorCodes.CASH_OPERATION_FAILED]: {
    title: "Error de caja",
    message: "No se pudo completar la operación de caja.",
    severity: "error",
    retryable: true,
    action: { kind: "retry" },
  },
  [ErrorCodes.SYNC_ERROR]: {
    title: "Error de sincronización",
    message: "No se pudieron sincronizar los datos. Se reintentará automáticamente.",
    severity: "warning",
    retryable: true,
  },
  [ErrorCodes.OFFLINE_NOT_SUPPORTED]: {
    title: "No disponible sin conexión",
    message: "Esta función requiere conexión al servidor.",
    severity: "info",
    retryable: false,
  },
  [ErrorCodes.LOCAL_STORAGE_FULL]: {
    title: "Almacenamiento local lleno",
    message: "No hay espacio para guardar más datos localmente. Sincroniza los cambios pendientes.",
    severity: "warning",
    retryable: false,
  },
  [ErrorCodes.TAURI_COMMAND_ERROR]: {
    title: "Error del sistema",
    message: "Ocurrió un error al ejecutar un comando local.",
    severity: "error",
    retryable: true,
    action: { kind: "retry" },
  },
  [ErrorCodes.SQLITE_ERROR]: {
    title: "Error de base de datos local",
    message: "Ocurrió un error en la base de datos local. Reinicia la aplicación.",
    severity: "error",
    retryable: false,
  },
  [ErrorCodes.PRINTER_UNAVAILABLE]: {
    title: "Impresora no disponible",
    message: "La impresora no responde. Verifica que esté encendida.",
    severity: "warning",
    retryable: true,
    action: { kind: "retry" },
  },
  [ErrorCodes.DESKTOP_LICENSE_ERROR]: {
    title: "Error de licencia",
    message: "La licencia del dispositivo no es válida o ha expirado.",
    severity: "error",
    retryable: false,
    action: { kind: "redirect", url: "/login" },
  },
  [ErrorCodes.INTERNAL_ERROR]: {
    title: "Error interno",
    message: "Ocurrió un error inesperado. Si el problema persiste, contacta al administrador.",
    severity: "error",
    retryable: true,
    action: { kind: "retry" },
  },
  [ErrorCodes.SERVICE_UNAVAILABLE]: {
    title: "Servicio no disponible",
    message: "El servicio está temporalmente fuera de línea. Intenta más tarde.",
    severity: "warning",
    retryable: true,
  },
  [ErrorCodes.UNKNOWN_ERROR]: {
    title: "Error inesperado",
    message: "Ocurrió un error que no pudimos identificar.",
    severity: "error",
    retryable: true,
  },
};

function extractFieldErrors(body: Record<string, unknown>): Record<string, string> | undefined {
  const details = body.details;
  if (typeof details === "object" && details !== null) {
    const d = details as Record<string, unknown>;
    if (Array.isArray(d.fields)) {
      const fields = d.fields as Array<{ field?: string; message?: string }>;
      const result: Record<string, string> = {};
      for (const f of fields) {
        if (f.field && f.message) result[f.field] = f.message;
      }
      return Object.keys(result).length > 0 ? result : undefined;
    }
  }
  return undefined;
}

function safeJsonParse(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function matchHttpToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 401: return ErrorCodes.AUTH_SESSION_EXPIRED;
    case 403: return ErrorCodes.ACCESS_DENIED;
    case 404: return ErrorCodes.RESOURCE_NOT_FOUND;
    case 409: return ErrorCodes.RESOURCE_CONFLICT;
    case 422: return ErrorCodes.VALIDATION_ERROR;
    case 502: return ErrorCodes.BAD_GATEWAY;
    case 503: return ErrorCodes.SERVICE_UNAVAILABLE;
    default: return status >= 500 ? ErrorCodes.INTERNAL_ERROR : ErrorCodes.UNKNOWN_ERROR;
  }
}

function buildError(params: {
  code: string;
  title?: string;
  message?: string;
  description?: string;
  severity?: ErrorSeverity;
  retryable?: boolean;
  correlationId?: string;
  fieldErrors?: Record<string, string>;
  action?: ErrorAction;
  status?: number;
  originalType?: string;
  stack?: string;
  endpoint?: string;
  payload?: Record<string, unknown>;
  userId?: string;
}): ParkFlowError {
  const known = knownErrorCodes[params.code];
  const httpMsg = !known && params.status ? knownHttpMessages[params.status] : undefined;
  const now = new Date().toISOString();

  return {
    code: params.code,
    title: params.title || known?.title || httpMsg?.title || "Error inesperado",
    message: params.message || known?.message || httpMsg?.message || "",
    description: params.description,
    severity: params.severity || known?.severity || "error",
    retryable: params.retryable ?? known?.retryable ?? false,
    correlationId: params.correlationId,
    fieldErrors: params.fieldErrors,
    action: params.action || known?.action,
    technical: {
      type: "ParkFlowError",
      status: params.status,
      originalType: params.originalType,
      stack: params.stack,
      endpoint: params.endpoint,
      payload: params.payload,
      userId: params.userId,
      timestamp: now,
    },
  };
}

export interface IErrorService {
  normalize(error: unknown, context?: {
    endpoint?: string;
    payload?: Record<string, unknown>;
  }): ParkFlowError;

  toast: {
    error: (errorOrMessage: unknown, options?: ToastOptions) => ParkFlowError;
    success: (message: string) => void;
    warning: (errorOrMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info: (message: string) => void;
  };

  getFormErrors(error: unknown): Record<string, string>;

  getUserError(error: unknown, context?: string): ParkFlowError;
}

export const errorService: IErrorService = {
  normalize(error: unknown, context?: {
    endpoint?: string;
    payload?: Record<string, unknown>;
  }): ParkFlowError {
    const userId = typeof window !== "undefined"
      ? window.localStorage.getItem("parkflow_user_id") || undefined
      : undefined;

    if (typeof error === "object" && error !== null && "code" in error && "technical" in error) {
      return error as ParkFlowError;
    }

    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) {
          fieldErrors[path] = translateZodMessage(issue.message, path);
        }
      }
      return buildError({
        code: ErrorCodes.VALIDATION_ERROR,
        fieldErrors,
        originalType: "ZodError",
        stack: error.stack,
        endpoint: context?.endpoint,
        payload: context?.payload,
        userId,
      });
    }

    if (error instanceof Error) {
      const msg = error.message || "";
      const lowerMsg = msg.toLowerCase();

      if (lowerMsg.includes("failed to fetch") || lowerMsg.includes("networkerror") || lowerMsg.includes("network error") || lowerMsg.includes("load failed")) {
        return buildError({
          code: ErrorCodes.NETWORK_ERROR,
          originalType: error.name,
          stack: error.stack,
          endpoint: context?.endpoint,
          userId,
        });
      }

      if (lowerMsg.includes("timeout") || lowerMsg.includes("timed out") || lowerMsg.includes("abort")) {
        return buildError({
          code: ErrorCodes.NETWORK_TIMEOUT,
          originalType: error.name,
          stack: error.stack,
          endpoint: context?.endpoint,
          userId,
        });
      }

      const apiError = error as { status?: number; code?: string; correlationId?: string; details?: Record<string, unknown> };
      if (apiError.status) {
        const code = apiError.code || matchHttpToErrorCode(apiError.status);
        const fieldErrors = apiError.details ? extractFieldErrors(apiError.details as Record<string, unknown>) : undefined;
        return buildError({
          code,
          status: apiError.status,
          correlationId: apiError.correlationId,
          fieldErrors,
          originalType: error.name,
          stack: error.stack,
          endpoint: context?.endpoint,
          payload: context?.payload,
          userId,
        });
      }

      if (lowerMsg.includes("offline") || lowerMsg.includes("sin conexion")) {
        return buildError({
          code: ErrorCodes.NETWORK_OFFLINE,
          message: "Los datos se guardarán localmente y se sincronizarán cuando vuelva la conexión.",
          severity: "info",
          retryable: false,
          originalType: error.name,
          stack: error.stack,
          endpoint: context?.endpoint,
          userId,
        });
      }

      if (msg.includes("404") || msg.includes("No active") || msg.includes("No hay caja")) {
        return buildError({
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          originalType: error.name,
          stack: error.stack,
          endpoint: context?.endpoint,
          userId,
        });
      }

      return buildError({
        code: ErrorCodes.UNKNOWN_ERROR,
        message: msg,
        originalType: error.name,
        stack: error.stack,
        endpoint: context?.endpoint,
        payload: context?.payload,
        userId,
      });
    }

    if (typeof error === "object" && error !== null) {
      const obj = error as Record<string, unknown>;
      const status = typeof obj.status === "number" ? obj.status : undefined;
      const code = typeof obj.code === "string" ? obj.code : (status ? matchHttpToErrorCode(status) : ErrorCodes.UNKNOWN_ERROR);
      const message = (typeof obj.userMessage === "string" ? obj.userMessage : typeof obj.message === "string" ? obj.message : undefined) as string | undefined;
      const correlationId = typeof obj.correlationId === "string" ? obj.correlationId : undefined;
      const fieldErrors = extractFieldErrors(obj);

      return buildError({
        code,
        message,
        status,
        correlationId,
        fieldErrors,
        originalType: "ResponseError",
        endpoint: context?.endpoint,
        payload: context?.payload,
        userId,
      });
    }

    return buildError({
      code: ErrorCodes.UNKNOWN_ERROR,
      message: typeof error === "string" ? error : undefined,
      originalType: typeof error,
      endpoint: context?.endpoint,
      userId,
    });
  },

  toast: {
    error(errorOrMessage: unknown, options?: ToastOptions): ParkFlowError {
      let pfError: ParkFlowError;
      if (typeof errorOrMessage === "string") {
        pfError = buildError({
          code: ErrorCodes.UNKNOWN_ERROR,
          message: errorOrMessage,
          severity: "error",
          retryable: false,
        });
      } else {
        pfError = errorService.normalize(errorOrMessage);
      }
      const title = options?.title || pfError.title;
      const message = pfError.message || pfError.description || "";
      toast.danger(title ? `${title}: ${message}` : message);
      logError(pfError);
      return pfError;
    },

    success(message: string) {
      toast.success(message);
    },

    warning(errorOrMessage: unknown, options?: ToastOptions): ParkFlowError {
      let pfError: ParkFlowError;
      if (typeof errorOrMessage === "string") {
        pfError = buildError({
          code: ErrorCodes.UNKNOWN_ERROR,
          message: errorOrMessage,
          severity: "warning",
          retryable: true,
        });
      } else {
        pfError = errorService.normalize(errorOrMessage);
      }
      const title = options?.title || pfError.title;
      const message = pfError.message || pfError.description || "";
      toast.warning(title ? `${title}: ${message}` : message);
      logError(pfError);
      return pfError;
    },

    info(message: string) {
      toast(message);
    },
  },

  getFormErrors(error: unknown): Record<string, string> {
    if (error instanceof ZodError) {
      const result: Record<string, string> = {};
      for (const issue of error.issues) {
        const path = issue.path.join(".");
        if (!result[path]) result[path] = translateZodMessage(issue.message, path);
      }
      return result;
    }

    const pfError = errorService.normalize(error);
    return pfError.fieldErrors || {};
  },

  getUserError(error: unknown, context?: string): ParkFlowError {
    return errorService.normalize(error);
  },
};

function logError(pfError: ParkFlowError): void {
  if (process.env.NODE_ENV === "development") {
    console.error("[ParkFlow Error]", {
      code: pfError.code,
      title: pfError.title,
      message: pfError.message,
      severity: pfError.severity,
      correlationId: pfError.correlationId,
      fieldErrors: pfError.fieldErrors,
      technical: pfError.technical,
    });
  }
}

const FIELD_NAMES: Record<string, string> = {
  plate: "Placa",
  noPlate: "Sin placa",
  type: "Tipo de vehículo",
  email: "Correo electrónico",
  password: "Contraseña",
  site: "Sede",
  lane: "Carril",
  booth: "Cabina",
  terminal: "Terminal",
  amount: "Monto",
  reason: "Motivo",
  name: "Nombre",
};

const ZOD_TRANSLATIONS: Array<{
  pattern: RegExp;
  translate: (match: string, fieldName: string) => string;
}> = [
  { pattern: /String must contain at most (\d+) character/, translate: (m, f) => `${f} no puede superar los ${m.match(/\d+/)?.[0]} caracteres.` },
  { pattern: /String must contain at least (\d+) character/, translate: (m, f) => `${f} debe tener al menos ${m.match(/\d+/)?.[0]} caracteres.` },
  { pattern: /Required/, translate: (_, f) => `${f} es obligatorio.` },
  { pattern: /Invalid email/i, translate: (_, f) => `${f} debe ser un correo válido.` },
  { pattern: /Invalid date/i, translate: (_, f) => `${f} debe ser una fecha válida.` },
  { pattern: /Expected number/i, translate: (_, f) => `${f} debe ser un número válido.` },
  { pattern: /Invalid enum value/i, translate: (_, f) => `${f}: selecciona una opción válida.` },
  { pattern: /Input not allowed/i, translate: (_, f) => `${f}: valor no permitido.` },
  { pattern: /String must contain at least 1/, translate: (_, f) => `${f} es obligatorio.` },
];

function getFieldName(key: string): string {
  return FIELD_NAMES[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function translateZodMessage(message: string, fieldName: string): string {
  const friendlyName = getFieldName(fieldName);
  for (const { pattern, translate } of ZOD_TRANSLATIONS) {
    if (pattern.test(message)) return translate(message, friendlyName);
  }
  return `${friendlyName}: ${message}`;
}