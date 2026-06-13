import { ErrorCode } from "./error-codes";

export interface UserFriendlyError {
  title: string;
  description: string;
  actionLabel?: string;
  severity: "error" | "warning" | "info";
}

export const GLOBAL_ERROR_MESSAGES: Record<string, Partial<UserFriendlyError>> = {
  [ErrorCode.AUTH_SESSION_EXPIRED]: {
    title: "Tu sesión ha expirado",
    description: "Por seguridad, por favor inicia sesión nuevamente para continuar.",
    actionLabel: "Iniciar sesión",
  },
  [ErrorCode.ACCESS_DENIED]: {
    title: "Acceso denegado",
    description: "No tienes los permisos necesarios para realizar esta acción.",
  },
  [ErrorCode.NETWORK_ERROR]: {
    title: "Sin conexión",
    description: "No fue posible conectar con el servidor. Verifica tu internet o el estado de la red local.",
    actionLabel: "Reintentar",
  },
  [ErrorCode.DATABASE_CONSTRAINT_ERROR]: {
    title: "Registro duplicado",
    description: "Ya existe un registro con estos datos. Verifica la información e intenta de nuevo.",
  },
  [ErrorCode.INTERNAL_ERROR]: {
    title: "Problema técnico",
    description: "Ocurrió un error inesperado en el sistema. Si el problema persiste, contacta al administrador.",
  },
};

export const CONTEXT_ERROR_MESSAGES: Record<string, Record<string, Partial<UserFriendlyError>>> = {
  "companies.load": {
    fallback: {
      title: "No fue posible cargar las empresas",
      description: "Ocurrió un problema obteniendo la lista de empresas. Intenta nuevamente.",
    },
  },
  "companies.create": {
    [ErrorCode.COMPANY_ALREADY_EXISTS]: {
      title: "La empresa ya existe",
      description: "Ya hay una empresa registrada con este NIT o nombre.",
    },
    [ErrorCode.USER_EMAIL_ALREADY_EXISTS]: {
      title: "Email ya registrado",
      description: "El correo electrónico de la empresa ya está registrado como usuario en el sistema. Usa un email diferente o contacta al administrador.",
    },
    [ErrorCode.DATABASE_CONSTRAINT_ERROR]: {
      title: "Email ya registrado",
      description: "El correo electrónico de la empresa ya está registrado como usuario en el sistema. Usa un email diferente o contacta al administrador.",
    },
    fallback: {
      title: "No fue posible crear la empresa",
      description: "Revisa los datos e intenta nuevamente.",
    },
  },
  "companies.update": {
    fallback: {
      title: "No fue posible actualizar la empresa",
      description: "Verifica la información e intenta de nuevo.",
    },
  },
  "auth.login": {
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: {
      title: "Credenciales incorrectas",
      description: "El correo o la contraseña no son válidos. Intenta de nuevo.",
    },
    fallback: {
      title: "No fue posible iniciar sesión",
      description: "Hubo un problema al autenticar tu cuenta. Intenta más tarde.",
    },
  },
  "tickets.create": {
    [ErrorCode.VEHICLE_PLATE_REQUIRED]: {
      title: "Placa requerida",
      description: "Debes ingresar una placa válida para registrar el ingreso.",
    },
    [ErrorCode.VALIDATION_ERROR]: {
      title: "Datos inválidos",
      description: "Revisa los datos ingresados. Verifica la placa, tipo de vehículo y estado.",
    },
    [ErrorCode.OPERATION_ERROR]: {
      title: "Error en la operación",
      description: "No se pudo registrar el ingreso. Verifica los datos e intenta nuevamente.",
    },
    fallback: {
      title: "No se pudo registrar el ingreso",
      description: "La operación no se completó. Verifica el estado del sistema.",
    },
  },
  "print-agent": {
    [ErrorCode.PRINT_AGENT_UNAVAILABLE]: {
      title: "Impresora no disponible",
      description: "El agente de impresión local no responde. Puedes continuar la operación y reimprimir luego.",
    },
    fallback: {
      title: "Error de impresión",
      description: "No se pudo completar la impresión del ticket.",
    },
  },
};

export enum FrontendActionError {
  LOAD_DATA = "LOAD_DATA",
  SAVE_DATA = "SAVE_DATA",
  DELETE_DATA = "DELETE_DATA",
  CHANGE_STATUS = "CHANGE_STATUS",
  AUTH_ACTION = "AUTH_ACTION",
  PRINT_ACTION = "PRINT_ACTION",
  CASH_OPERATION = "CASH_OPERATION",
  REPORT_ACTION = "REPORT_ACTION",
  UNKNOWN = "UNKNOWN"
}

export const FallbackActionMessages: Record<FrontendActionError, string> = {
  [FrontendActionError.LOAD_DATA]: "No se pudo cargar la información.",
  [FrontendActionError.SAVE_DATA]: "No se pudieron guardar los cambios.",
  [FrontendActionError.DELETE_DATA]: "No se pudo eliminar el registro.",
  [FrontendActionError.CHANGE_STATUS]: "No se pudo cambiar el estado.",
  [FrontendActionError.AUTH_ACTION]: "Hubo un error de autenticación.",
  [FrontendActionError.PRINT_ACTION]: "No se pudo completar la impresión.",
  [FrontendActionError.CASH_OPERATION]: "No se pudo completar la operación de caja.",
  [FrontendActionError.REPORT_ACTION]: "No se pudo generar el reporte.",
  [FrontendActionError.UNKNOWN]: "Ha ocurrido un error inesperado."
};

/**
 * Obtiene un mensaje amigable combinando GLOBAL_ERROR_MESSAGES o mensajes por defecto basados en HTTP.
 */
export function getUserFriendlyErrorMessage(error: unknown, fallbackAction: FrontendActionError = FrontendActionError.UNKNOWN): string {
  if (error instanceof Error) {
    const apiError = error as any;
    
    if (apiError.code && GLOBAL_ERROR_MESSAGES[apiError.code]) {
      return GLOBAL_ERROR_MESSAGES[apiError.code].description || GLOBAL_ERROR_MESSAGES[apiError.code].title || FallbackActionMessages[fallbackAction];
    }

    if (apiError.status) {
      switch (apiError.status) {
        case 400: return "Datos inválidos o incompletos. Por favor, revisa la información ingresada.";
        case 401: return "Tu sesión ha expirado o credenciales incorrectas.";
        case 403: return "No tienes permisos suficientes para realizar esta acción.";
        case 404: return "El recurso solicitado no existe o fue eliminado.";
        case 409: return "Conflicto con los datos actuales. Es posible que el registro ya exista o haya sido modificado.";
        case 500: return "Ocurrió un error interno en el servidor. Por favor, intenta de nuevo más tarde.";
      }
    }

    // Usar el userMessage si no contiene texto técnico.
    if (error.message && error.message.trim().length > 0 && !error.message.includes("status code") && !error.message.includes("Unexpected token")) {
      return error.message;
    }
  }

  return FallbackActionMessages[fallbackAction];
}
