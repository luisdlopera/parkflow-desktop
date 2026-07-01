import { ErrorCode } from "./error-codes";

export type ErrorSeverity = "error" | "warning" | "info";

export interface UserFriendlyError {
  title: string;
  description: string;
  actionLabel?: string;
  severity: ErrorSeverity;
}

export const FrontendActionError = {
  LOAD_DATA: "LOAD_DATA",
  SAVE_DATA: "SAVE_DATA",
  DELETE_DATA: "DELETE_DATA",
  CHANGE_STATUS: "CHANGE_STATUS",
  AUTH_ACTION: "AUTH_ACTION",
  PRINT_ACTION: "PRINT_ACTION",
  CASH_OPERATION: "CASH_OPERATION",
  REPORT_ACTION: "REPORT_ACTION",
  UNKNOWN: "UNKNOWN",
} as const;

export type FrontendActionError = (typeof FrontendActionError)[keyof typeof FrontendActionError];

export const FallbackActionMessages: Record<FrontendActionError, string> = {
  [FrontendActionError.LOAD_DATA]: "No fue posible cargar la información. Intenta nuevamente.",
  [FrontendActionError.SAVE_DATA]: "No fue posible guardar los cambios. Intenta nuevamente.",
  [FrontendActionError.DELETE_DATA]: "No fue posible eliminar el registro. Intenta nuevamente.",
  [FrontendActionError.CHANGE_STATUS]: "No fue posible cambiar el estado. Intenta nuevamente.",
  [FrontendActionError.AUTH_ACTION]: "No fue posible completar la acción de autenticación. Intenta nuevamente.",
  [FrontendActionError.PRINT_ACTION]: "No fue posible completar la acción de impresión. Intenta nuevamente.",
  [FrontendActionError.CASH_OPERATION]: "No fue posible completar la operación de caja. Intenta nuevamente.",
  [FrontendActionError.REPORT_ACTION]: "No fue posible generar el reporte. Intenta nuevamente.",
  [FrontendActionError.UNKNOWN]: "Ocurrió un error inesperado. Intenta nuevamente.",
};

export const GLOBAL_ERROR_MESSAGES: Partial<Record<ErrorCode, UserFriendlyError>> = {
  [ErrorCode.NETWORK_ERROR]: {
    title: "Sin conexión",
    description: "No fue posible conectar con el servidor. Verifica tu conexión.",
    actionLabel: "Reintentar",
    severity: "warning",
  },
  [ErrorCode.NETWORK_TIMEOUT]: {
    title: "Tiempo de espera agotado",
    description: "El servidor no respondió a tiempo. Verifica tu conexión.",
    actionLabel: "Reintentar",
    severity: "warning",
  },
  [ErrorCode.NETWORK_OFFLINE]: {
    title: "Sin conexión a internet",
    description: "Los cambios se guardarán localmente y se sincronizarán cuando vuelva la conexión.",
    actionLabel: "Reintentar",
    severity: "info",
  },
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: {
    title: "Credenciales incorrectas",
    description: "El correo o la contraseña no son válidos.",
    actionLabel: "Iniciar sesión",
    severity: "error",
  },
  [ErrorCode.AUTH_SESSION_EXPIRED]: {
    title: "Tu sesión ha expirado",
    description: "Por seguridad, por favor inicia sesión nuevamente para continuar.",
    actionLabel: "Iniciar sesión",
    severity: "error",
  },
  [ErrorCode.ACCESS_DENIED]: {
    title: "Acceso denegado",
    description: "No tienes permisos para realizar esta acción.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.AUTH_REFRESH_FAILED]: {
    title: "No se pudo renovar la sesión",
    description: "Inicia sesión nuevamente para continuar.",
    actionLabel: "Iniciar sesión",
    severity: "error",
  },
  [ErrorCode.AUTH_DEVICE_LOCKED]: {
    title: "Dispositivo bloqueado",
    description: "Este dispositivo ha sido bloqueado por el administrador.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.COMPANY_NOT_FOUND]: {
    title: "Empresa no encontrada",
    description: "La empresa solicitada no existe.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.COMPANY_NAME_REQUIRED]: {
    title: "Nombre de empresa requerido",
    description: "Debes ingresar el nombre de la empresa.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.COMPANY_ALREADY_EXISTS]: {
    title: "Empresa duplicada",
    description: "Ya existe una empresa con esos datos.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.USER_EMAIL_ALREADY_EXISTS]: {
    title: "Email ya registrado",
    description: "Ya existe un usuario con ese correo electrónico.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.LICENSE_EXPIRED]: {
    title: "Licencia vencida",
    description: "La licencia ha expirado.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.LICENSE_DISABLED]: {
    title: "Licencia deshabilitada",
    description: "La licencia está deshabilitada.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.PARKING_RATE_NOT_FOUND]: {
    title: "Tarifa no encontrada",
    description: "La tarifa de parqueo solicitada no existe.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.VEHICLE_PLATE_REQUIRED]: {
    title: "Placa requerida",
    description: "Debes ingresar una placa válida para continuar.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.TICKET_NOT_FOUND]: {
    title: "Ticket no encontrado",
    description: "El ticket solicitado no existe.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.PRINT_AGENT_UNAVAILABLE]: {
    title: "Impresora no disponible",
    description: "El agente de impresión no responde. Verifica que esté ejecutándose.",
    actionLabel: "Reintentar",
    severity: "warning",
  },
  [ErrorCode.RESOURCE_CONFLICT]: {
    title: "Conflicto",
    description: "El registro ya existe o fue modificado por otro usuario.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.DUPLICATE_ENTITY]: {
    title: "Registro duplicado",
    description: "Ya existe un registro con esos datos.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.VALIDATION_ERROR]: {
    title: "Datos inválidos",
    description: "Revisa los campos marcados e intenta nuevamente.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    title: "No encontrado",
    description: "El recurso solicitado no existe o fue eliminado.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.DATABASE_CONSTRAINT_ERROR]: {
    title: "Registro duplicado",
    description: "Ya existe un registro con esos datos.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.OPERATION_ERROR]: {
    title: "Error en la operación",
    description: "No se pudo completar la operación.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.PRINT_ERROR]: {
    title: "Error de impresión",
    description: "No se pudo imprimir. Verifica la impresora.",
    actionLabel: "Reintentar",
    severity: "warning",
  },
  [ErrorCode.CASH_OPERATION_FAILED]: {
    title: "Error de caja",
    description: "No se pudo completar la operación de caja.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.SYNC_ERROR]: {
    title: "Error de sincronización",
    description: "No se pudieron sincronizar los datos. Se reintentará automáticamente.",
    actionLabel: "Reintentar",
    severity: "warning",
  },
  [ErrorCode.OFFLINE_NOT_SUPPORTED]: {
    title: "No disponible sin conexión",
    description: "Esta función requiere conexión al servidor.",
    actionLabel: "Reintentar",
    severity: "info",
  },
  [ErrorCode.LOCAL_STORAGE_FULL]: {
    title: "Almacenamiento local lleno",
    description: "No hay espacio para guardar más datos localmente.",
    actionLabel: "Reintentar",
    severity: "warning",
  },
  [ErrorCode.TAURI_COMMAND_ERROR]: {
    title: "Error del sistema",
    description: "Ocurrió un error al ejecutar un comando local.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.SQLITE_ERROR]: {
    title: "Error de base de datos local",
    description: "Ocurrió un error en la base de datos local. Reinicia la aplicación.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.PRINTER_UNAVAILABLE]: {
    title: "Impresora no disponible",
    description: "La impresora no responde. Verifica que esté encendida.",
    actionLabel: "Reintentar",
    severity: "warning",
  },
  [ErrorCode.DESKTOP_LICENSE_ERROR]: {
    title: "Error de licencia",
    description: "La licencia del dispositivo no es válida o ha expirado.",
    actionLabel: "Iniciar sesión",
    severity: "error",
  },
  [ErrorCode.INTERNAL_ERROR]: {
    title: "Problema técnico",
    description: "Ocurrió un error interno. Intenta nuevamente.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.UNKNOWN_ERROR]: {
    title: "Error inesperado",
    description: "Ocurrió un error que no pudimos identificar.",
    actionLabel: "Reintentar",
    severity: "error",
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    title: "Servicio no disponible",
    description: "El servicio está temporalmente fuera de línea. Intenta más tarde.",
    actionLabel: "Reintentar",
    severity: "warning",
  },
  [ErrorCode.BAD_GATEWAY]: {
    title: "Servicio temporalmente no disponible",
    description: "El servidor respondió con un error temporal. Intenta nuevamente.",
    actionLabel: "Reintentar",
    severity: "warning",
  },
};

type ContextMessages = Record<string, UserFriendlyError> & {
  fallback: UserFriendlyError;
};

export const CONTEXT_ERROR_MESSAGES: Record<string, ContextMessages> = {
  "companies.create": {
    fallback: {
      title: "No fue posible crear la empresa",
      description: "No pudimos crear la empresa. Verifica los datos e intenta nuevamente.",
      actionLabel: "Reintentar",
      severity: "error",
    },
    [ErrorCode.COMPANY_ALREADY_EXISTS]: {
      title: "La empresa ya existe",
      description: "Ya hay una empresa registrada con esos datos.",
      actionLabel: "Reintentar",
      severity: "error",
    },
    [ErrorCode.USER_EMAIL_ALREADY_EXISTS]: {
      title: "Email ya registrado",
      description: "Ya existe un usuario con ese correo electrónico.",
      actionLabel: "Reintentar",
      severity: "error",
    },
    [ErrorCode.VALIDATION_ERROR]: {
      title: "Datos inválidos",
      description: "Revisa los campos e intenta nuevamente.",
      actionLabel: "Reintentar",
      severity: "error",
    },
    [ErrorCode.OPERATION_ERROR]: {
      title: "No fue posible crear la empresa",
      description: "No pudimos crear la empresa. Verifica los datos e intenta nuevamente.",
      actionLabel: "Reintentar",
      severity: "error",
    },
  },
  "companies.load": {
    fallback: {
      title: "No fue posible cargar las empresas",
      description: "No pudimos cargar la lista de empresas. Intenta nuevamente.",
      actionLabel: "Reintentar",
      severity: "error",
    },
  },
  "companies.update": {
    fallback: {
      title: "No fue posible actualizar la empresa",
      description: "No pudimos actualizar la información de la empresa. Verifica los datos e intenta nuevamente.",
      actionLabel: "Reintentar",
      severity: "error",
    },
  },
  "auth.login": {
    fallback: {
      title: "No fue posible iniciar sesión",
      description: "Verifica tu correo y contraseña e intenta nuevamente.",
      actionLabel: "Iniciar sesión",
      severity: "error",
    },
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: {
      title: "Credenciales incorrectas",
      description: "El correo o la contraseña no son válidos.",
      actionLabel: "Reintentar",
      severity: "error",
    },
  },
  "tickets.create": {
    fallback: {
      title: "No fue posible registrar el ticket",
      description: "Verifica la placa válida y vuelve a intentarlo.",
      actionLabel: "Reintentar",
      severity: "error",
    },
    [ErrorCode.VEHICLE_PLATE_REQUIRED]: {
      title: "Placa requerida",
      description: "Debes ingresar una placa válida para continuar.",
      actionLabel: "Reintentar",
      severity: "error",
    },
    [ErrorCode.VALIDATION_ERROR]: {
      title: "Datos inválidos",
      description: "Revisa los campos del formulario.",
      actionLabel: "Reintentar",
      severity: "error",
    },
    [ErrorCode.OPERATION_ERROR]: {
      title: "No fue posible registrar el ticket",
      description: "Revisa la información e intenta nuevamente.",
      actionLabel: "Reintentar",
      severity: "error",
    },
  },
  "print-agent": {
    fallback: {
      title: "Impresora no disponible",
      description: "El agente de impresión no responde. Verifica que esté ejecutándose.",
      actionLabel: "Reintentar",
      severity: "warning",
    },
    [ErrorCode.PRINT_AGENT_UNAVAILABLE]: {
      title: "Impresora no disponible",
      description: "El agente de impresión no responde. Verifica que esté ejecutándose.",
      actionLabel: "Reintentar",
      severity: "warning",
    },
  },
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "Datos inválidos. Revisa la información ingresada.",
  401: "Tu sesión ha expirado. Inicia sesión nuevamente.",
  403: "No tienes permisos para realizar esta acción.",
  404: "El recurso solicitado no existe o fue eliminado.",
  409: "Conflicto de datos. El registro ya existe o fue modificado por otro usuario.",
  422: "Datos inválidos. Revisa los campos marcados.",
  500: "Ocurrió un error interno. Intenta nuevamente.",
};

function isTechnicalMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    !normalized ||
    normalized.includes("status code") ||
    normalized.includes("unexpected token") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("syntaxerror")
  );
}

function getGlobalByCode(code: string | undefined): UserFriendlyError | undefined {
  if (!code) return undefined;
  return GLOBAL_ERROR_MESSAGES[code as ErrorCode];
}

function getStatusMessage(status?: number): string | undefined {
  return status ? STATUS_MESSAGES[status] : undefined;
}

function getContextMessage(context: string | undefined, code?: string): UserFriendlyError | undefined {
  if (!context) return undefined;
  const contextMessages = CONTEXT_ERROR_MESSAGES[context];
  if (!contextMessages) return undefined;
  if (code && contextMessages[code]) return contextMessages[code];
  return contextMessages.fallback;
}

export function getUserFriendlyErrorMessage(error: unknown, action: FrontendActionError = FrontendActionError.UNKNOWN): string {
  if (typeof error === "string") {
    return error.trim() || FallbackActionMessages[action];
  }

  if (error instanceof Error) {
    const typed = error as Error & { code?: string; status?: number };
    const codeMessage = getGlobalByCode(typed.code);
    if (codeMessage) return codeMessage.description || codeMessage.title;

    const statusMessage = getStatusMessage(typed.status);
    if (statusMessage) return statusMessage;

    if (!isTechnicalMessage(typed.message)) {
      return typed.message.trim();
    }
  }

  if (typeof error === "object" && error !== null) {
    const typed = error as { code?: string; status?: number; message?: string; userMessage?: string };
    const codeMessage = getGlobalByCode(typed.code);
    if (codeMessage) return codeMessage.description || codeMessage.title;

    const statusMessage = getStatusMessage(typed.status);
    if (statusMessage) return statusMessage;

    const message = typed.userMessage || typed.message;
    if (typeof message === "string" && !isTechnicalMessage(message)) return message.trim();
  }

  return FallbackActionMessages[action];
}
