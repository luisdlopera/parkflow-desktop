/**
 * Centralized error translation system for Zod validation errors and backend API errors.
 * Converts technical error messages into user-friendly Spanish messages.
 */

import { ZodError } from "zod";

/**
 * Diccionario de traducciones para nombres de campos internos
 */
export const FIELD_NAMES: Record<string, string> = {
  // Vehicular
  plate: "Placa",
  noPlate: "Sin placa",
  noPlateReason: "Razón por la que no tiene placa",
  foreignPlate: "Placa extranjera",
  type: "Tipo de vehículo",
  countryCode: "País",
  entryMode: "Modo de entrada",
  rateId: "Tarifa",
  parkingSpaceId: "Celda de parqueo",
  vehicleCondition: "Estado del vehículo",

  // Cascos/Artículos guardados
  custodiedItems: "Artículos guardados",
  identifier: "Número de locker",
  observations: "Observaciones",
  photoUrl: "URL de foto",

  // Configuración general
  companyName: "Nombre de la empresa",
  email: "Correo electrónico",
  password: "Contraseña",
  site: "Sede",
  lane: "Carril",
  booth: "Cabina",
  terminal: "Terminal",
};

/**
 * Funciones para traducir patrones de errores de Zod
 */
export const ZOD_ERROR_PATTERNS: Array<{
  pattern: RegExp;
  translate: (match: string, fieldName: string) => string;
}> = [
  {
    pattern: /String must contain at most (\d+) character\(s\)/,
    translate: (_, fieldName) => {
      const match = _.match(/\d+/);
      const max = match ? match[0] : "N/A";
      return `${fieldName} no puede superar los ${max} caracteres.`;
    },
  },
  {
    pattern: /String must contain at least (\d+) character\(s\)/,
    translate: (_, fieldName) => {
      const match = _.match(/\d+/);
      const min = match ? match[0] : "N/A";
      return `${fieldName} debe tener al menos ${min} caracteres.`;
    },
  },
  {
    pattern: /Required/,
    translate: (_, fieldName) => `${fieldName} es obligatorio.`,
  },
  {
    pattern: /Invalid email/i,
    translate: (_, fieldName) => `${fieldName} debe ser un correo válido.`,
  },
  {
    pattern: /Invalid date/i,
    translate: (_, fieldName) => `${fieldName} debe ser una fecha válida.`,
  },
  {
    pattern: /Invalid enum value/i,
    translate: (_, fieldName) => `${fieldName}: selecciona una opción válida.`,
  },
  {
    pattern: /Expected number/i,
    translate: (_, fieldName) => `${fieldName} debe ser un número válido.`,
  },
  {
    pattern: /uuid/i,
    translate: (_, fieldName) => `${fieldName}: ID inválido.`,
  },
];

/**
 * Diccionario de códigos de error del backend
 */
export const BACKEND_ERROR_CODES: Record<string, string> = {
  AUTH_FORBIDDEN: "No tienes permisos para realizar esta acción.",
  AUTH_UNAUTHORIZED: "Debes iniciar sesión para continuar.",
  VEHICLE_ALREADY_EXISTS: "Ya existe un vehículo registrado con esa placa.",
  EMAIL_ALREADY_EXISTS: "Ya existe un usuario registrado con ese correo.",
  COMPANY_NOT_FOUND: "Empresa no encontrada.",
  RATE_NOT_FOUND: "Tarifa no encontrada.",
  PARKING_SPACE_NOT_FOUND: "Celda de parqueo no encontrada.",
  INVALID_PLATE_FORMAT: "Formato de placa inválido.",
  PARKING_FULL: "Parqueadero lleno.",
  SESSION_EXPIRED: "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
  UNKNOWN_ERROR: "Ocurrió un error. Intenta nuevamente.",
};

/**
 * Obtiene el nombre amigable de un campo
 */
export function getFieldName(fieldKey: string): string {
  return FIELD_NAMES[fieldKey] || fieldKey;
}

/**
 * Traduce un mensaje de error de Zod
 */
export function translateZodError(message: string, fieldName: string): string {
  for (const { pattern, translate } of ZOD_ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return translate(message, fieldName);
    }
  }
  // Si no coincide con ningún patrón, retorna el mensaje original con el nombre del campo
  return `${fieldName}: ${message}`;
}

/**
 * Convierte errores de Zod a un mapa amigable de campo -> mensaje
 */
export function zodErrorToFriendlyMap(
  zodError: ZodError
): Record<string, string> {
  const errorMap: Record<string, string> = {};

  zodError.errors.forEach((error) => {
    const fieldPath = error.path.join(".");
    const fieldName = getFieldName(fieldPath);
    const friendlyMessage = translateZodError(error.message, fieldName);

    // Si ya hay un error en este campo, mantén el primero
    if (!errorMap[fieldPath]) {
      errorMap[fieldPath] = friendlyMessage;
    }
  });

  return errorMap;
}

/**
 * Traduce un código de error del backend
 */
export function translateBackendError(
  errorCode: string,
  context?: Record<string, any>
): string {
  const message = BACKEND_ERROR_CODES[errorCode];

  if (!message) {
    return BACKEND_ERROR_CODES.UNKNOWN_ERROR;
  }

  // Permite interpolación simple de contexto si es necesario
  let result = message;
  if (context) {
    Object.entries(context).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, String(value));
    });
  }

  return result;
}
