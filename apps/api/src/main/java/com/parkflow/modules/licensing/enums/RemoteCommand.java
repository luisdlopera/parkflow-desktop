package com.parkflow.modules.licensing.enums;

/**
 * Comandos remotos que el backend puede enviar a dispositivos desktop.
 */
public enum RemoteCommand {
  /**
   * Bloquear completamente el sistema.
   */
  BLOCK_SYSTEM,

  /**
   * Deshabilitar sincronización cloud.
   */
  DISABLE_SYNC,

  /**
   * Deshabilitar un módulo específico.
   */
  DISABLE_MODULE,

  /**
   * Mostrar mensaje administrativo al usuario.
   */
  SHOW_ADMIN_MESSAGE,

  /**
   * Forzar actualización de la aplicación.
   */
  FORCE_UPDATE,

  /**
   * Solicitar renovación de licencia.
   */
  REQUEST_RENEWAL,

  /**
   * Alerta de pago próximo a vencer.
   */
  PAYMENT_REMINDER,

  /**
   * Limpiar caché local de licencia.
   */
  CLEAR_LICENSE_CACHE,

  /**
   * Revocar licencia del dispositivo.
   */
  REVOKE_LICENSE
}
