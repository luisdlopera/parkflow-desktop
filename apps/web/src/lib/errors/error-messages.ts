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
