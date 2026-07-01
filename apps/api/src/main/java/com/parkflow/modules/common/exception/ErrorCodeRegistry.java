package com.parkflow.modules.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Central registry of all API error codes.
 *
 * Frontend uses error.code to differentiate error types (not error.message).
 * Each code maps to a stable HTTP status and default Spanish message.
 *
 * Code format: {DOMAIN}_{NUMBER}
 * - RATE_001, RATE_002, etc.
 * - TENANT_001, TENANT_002, etc.
 * - AUTH_001, AUTH_002, etc.
 *
 * Invariant: Once released, codes MUST NOT change. If retired, mark as @Deprecated.
 */
public enum ErrorCodeRegistry {
  // ─────────────────────────────────────────────────────────────────
  // RATE (Tarifas)
  // ─────────────────────────────────────────────────────────────────
  RATE_NOT_FOUND("RATE_001", "La tarifa no existe", HttpStatus.NOT_FOUND),
  INVALID_RATE_TYPE("RATE_002", "Tipo de tarifa inválido", HttpStatus.BAD_REQUEST),
  DUPLICATE_RATE("RATE_003", "La tarifa ya existe", HttpStatus.CONFLICT),
  RATE_IN_USE("RATE_004", "La tarifa está en uso y no se puede eliminar", HttpStatus.CONFLICT),

  // ─────────────────────────────────────────────────────────────────
  // MULTI-TENANT
  // ─────────────────────────────────────────────────────────────────
  TENANT_NOT_FOUND("TENANT_001", "Empresa no encontrada", HttpStatus.NOT_FOUND),
  TENANT_ISOLATION_VIOLATION("TENANT_002", "Sin permiso para acceder este recurso", HttpStatus.FORBIDDEN),
  TENANT_QUOTA_EXCEEDED("TENANT_003", "Cuota de empresa excedida", HttpStatus.PAYMENT_REQUIRED),
  INVALID_COMPANY_ID("TENANT_004", "ID de empresa inválido", HttpStatus.BAD_REQUEST),

  // ─────────────────────────────────────────────────────────────────
  // AUTHENTICATION & AUTHORIZATION
  // ─────────────────────────────────────────────────────────────────
  INVALID_CREDENTIALS("AUTH_001", "Correo o contraseña incorrectos", HttpStatus.UNAUTHORIZED),
  TOKEN_EXPIRED("AUTH_002", "La sesión expiró", HttpStatus.UNAUTHORIZED),
  TOKEN_INVALID("AUTH_003", "Token inválido o malformado", HttpStatus.UNAUTHORIZED),
  INSUFFICIENT_PERMISSIONS("AUTH_004", "Sin permisos para esta acción", HttpStatus.FORBIDDEN),
  ACCOUNT_LOCKED("AUTH_005", "Cuenta bloqueada por intentos fallidos", HttpStatus.FORBIDDEN),
  ACCOUNT_DISABLED("AUTH_006", "Cuenta desactivada", HttpStatus.FORBIDDEN),

  // ─────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────
  VALIDATION_ERROR("VALIDATION_001", "Revisa los datos ingresados", HttpStatus.BAD_REQUEST),
  INVALID_EMAIL("VALIDATION_002", "Correo electrónico inválido", HttpStatus.BAD_REQUEST),
  INVALID_PLATE("VALIDATION_003", "Placa de vehículo inválida", HttpStatus.BAD_REQUEST),
  INVALID_PHONE("VALIDATION_004", "Número telefónico inválido", HttpStatus.BAD_REQUEST),
  REQUIRED_FIELD_MISSING("VALIDATION_005", "Campo requerido faltante", HttpStatus.BAD_REQUEST),
  INVALID_DATE_FORMAT("VALIDATION_006", "Formato de fecha inválido", HttpStatus.BAD_REQUEST),

  // ─────────────────────────────────────────────────────────────────
  // PARKING & SESSIONS
  // ─────────────────────────────────────────────────────────────────
  SESSION_NOT_FOUND("PARKING_001", "Sesión de parqueo no encontrada", HttpStatus.NOT_FOUND),
  SESSION_ALREADY_OPEN("PARKING_002", "Hay una sesión activa para este vehículo", HttpStatus.CONFLICT),
  SESSION_NOT_OPEN("PARKING_003", "No hay sesión activa", HttpStatus.BAD_REQUEST),
  PARKING_SPACE_NOT_FOUND("PARKING_004", "Espacio de parqueo no encontrado", HttpStatus.NOT_FOUND),
  PARKING_SPACE_OCCUPIED("PARKING_005", "Espacio de parqueo ocupado", HttpStatus.CONFLICT),
  PARKING_FULL("PARKING_006", "Parqueadero sin espacios disponibles", HttpStatus.BAD_REQUEST),
  VEHICLE_NOT_REGISTERED("PARKING_007", "Vehículo no registrado", HttpStatus.BAD_REQUEST),
  INVALID_EXIT_ATTEMPT("PARKING_008", "No se puede cerrar sesión en este estado", HttpStatus.BAD_REQUEST),

  // ─────────────────────────────────────────────────────────────────
  // BILLING & PAYMENTS
  // ─────────────────────────────────────────────────────────────────
  INVOICE_NOT_FOUND("INVOICE_001", "Factura no encontrada", HttpStatus.NOT_FOUND),
  PAYMENT_FAILED("INVOICE_002", "El pago no se procesó", HttpStatus.BAD_REQUEST),
  REFUND_NOT_ALLOWED("INVOICE_003", "No se puede reembolsar este pago", HttpStatus.BAD_REQUEST),
  PAYMENT_METHOD_INVALID("INVOICE_004", "Método de pago inválido o vencido", HttpStatus.BAD_REQUEST),
  DUPLICATE_PAYMENT("INVOICE_005", "Este pago ya fue procesado", HttpStatus.CONFLICT),
  INSUFFICIENT_BALANCE("INVOICE_006", "Saldo insuficiente", HttpStatus.BAD_REQUEST),

  // ─────────────────────────────────────────────────────────────────
  // LICENSING
  // ─────────────────────────────────────────────────────────────────
  LICENSE_NOT_FOUND("LICENSE_001", "Licencia no encontrada", HttpStatus.NOT_FOUND),
  LICENSE_EXPIRED("LICENSE_002", "Licencia expirada", HttpStatus.FORBIDDEN),
  LICENSE_INVALID("LICENSE_003", "Licencia inválida o no verificada", HttpStatus.FORBIDDEN),
  LICENSE_QUOTA_EXCEEDED("LICENSE_004", "Se alcanzó el límite de licencias", HttpStatus.PAYMENT_REQUIRED),

  // ─────────────────────────────────────────────────────────────────
  // SYSTEM & OPERATIONAL
  // ─────────────────────────────────────────────────────────────────
  INTERNAL_ERROR("SYSTEM_001", "Error interno del servidor", HttpStatus.INTERNAL_SERVER_ERROR),
  EXTERNAL_SERVICE_ERROR("SYSTEM_002", "Servicio externo no disponible", HttpStatus.SERVICE_UNAVAILABLE),
  DATABASE_ERROR("SYSTEM_003", "Error de base de datos", HttpStatus.INTERNAL_SERVER_ERROR),
  RESOURCE_ALREADY_EXISTS("SYSTEM_004", "El recurso ya existe", HttpStatus.CONFLICT),
  RESOURCE_NOT_FOUND("SYSTEM_005", "Recurso no encontrado", HttpStatus.NOT_FOUND),
  OPERATION_NOT_ALLOWED("SYSTEM_006", "Esta operación no está permitida en este momento", HttpStatus.BAD_REQUEST),
  FILE_UPLOAD_FAILED("SYSTEM_007", "Error al subir archivo", HttpStatus.BAD_REQUEST),
  FILE_NOT_FOUND("SYSTEM_008", "Archivo no encontrado", HttpStatus.NOT_FOUND),
  INVALID_FILE_TYPE("SYSTEM_009", "Tipo de archivo no permitido", HttpStatus.BAD_REQUEST),
  SYSTEM_OPERATION_FAILED("SYSTEM_010", "La operación no pudo completarse", HttpStatus.INTERNAL_SERVER_ERROR),
  CONCURRENT_MODIFICATION_ERROR("SYSTEM_011", "Los datos fueron modificados. Por favor recarga e intenta de nuevo", HttpStatus.CONFLICT),
  INVALID_STATE("SYSTEM_012", "Estado inválido para esta operación", HttpStatus.BAD_REQUEST),
  DATABASE_QUERY_ERROR("SYSTEM_013", "Error en consulta de base de datos", HttpStatus.INTERNAL_SERVER_ERROR),
  MALFORMED_REQUEST("SYSTEM_014", "El cuerpo de la solicitud JSON es inválido", HttpStatus.BAD_REQUEST),
  MISSING_PARAMETER("SYSTEM_015", "Parámetro requerido faltante", HttpStatus.BAD_REQUEST),
  TYPE_MISMATCH("SYSTEM_016", "Tipo de datos incorrecto para parámetro", HttpStatus.BAD_REQUEST),
  METHOD_NOT_SUPPORTED("SYSTEM_017", "Método HTTP no soportado para esta ruta", HttpStatus.METHOD_NOT_ALLOWED),
  UNSUPPORTED_MEDIA_TYPE("SYSTEM_018", "Tipo de contenido (Content-Type) no soportado", HttpStatus.UNSUPPORTED_MEDIA_TYPE);

  private final String code;
  private final String defaultMessage;
  private final HttpStatus httpStatus;

  ErrorCodeRegistry(String code, String defaultMessage, HttpStatus httpStatus) {
    this.code = code;
    this.defaultMessage = defaultMessage;
    this.httpStatus = httpStatus;
  }

  public String getCode() {
    return code;
  }

  public String getMessage() {
    return defaultMessage;
  }

  public HttpStatus getHttpStatus() {
    return httpStatus;
  }

  /**
   * Resolve ErrorCode from code string
   */
  public static ErrorCodeRegistry fromCode(String code) {
    for (ErrorCodeRegistry registry : values()) {
      if (registry.code.equals(code)) {
        return registry;
      }
    }
    return INTERNAL_ERROR;  // Fallback
  }
}
