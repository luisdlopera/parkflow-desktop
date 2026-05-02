package com.parkflow.modules.licensing.enums;

/**
 * Estados de una licencia específica de dispositivo.
 */
public enum LicenseStatus {
  /**
   * Licencia activa y válida.
   */
  ACTIVE,

  /**
   * Licencia expirada (fecha de vencimiento alcanzada).
   */
  EXPIRED,

  /**
   * Licencia revocada manualmente por admin.
   */
  REVOKED,

  /**
   * Licencia suspendida temporalmente.
   */
  SUSPENDED,

  /**
   * Dispositivo bloqueado por seguridad o fraude detectado.
   */
  BLOCKED,

  /**
   * Licencia en período de gracia post-expiración.
   */
  GRACE_PERIOD
}
