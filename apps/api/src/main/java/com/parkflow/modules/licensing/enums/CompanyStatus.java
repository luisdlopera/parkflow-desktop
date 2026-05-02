package com.parkflow.modules.licensing.enums;

/**
 * Estados posibles de una empresa en el sistema de licenciamiento.
 * Define el ciclo de vida comercial de un cliente.
 */
public enum CompanyStatus {
  /**
   * Empresa activa con licencia válida. Operación normal.
   */
  ACTIVE,

  /**
   * Pago atrasado pero dentro del período de gracia. Advertencias mostradas.
   */
  PAST_DUE,

  /**
   * Licencia suspendida temporalmente. Solo lectura/operaciones limitadas.
   */
  SUSPENDED,

  /**
   * Bloqueo administrativo. Acceso denegado hasta intervención manual.
   */
  BLOCKED,

  /**
   * Licencia expirada. Modo solo lectura, no nuevas operaciones.
   */
  EXPIRED,

  /**
   * Empresa en período de prueba gratuita.
   */
  TRIAL,

  /**
   * Empresa cancelada/desactivada por el cliente o administrador.
   */
  CANCELLED
}
