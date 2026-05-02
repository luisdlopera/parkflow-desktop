package com.parkflow.modules.licensing.enums;

/**
 * Módulos funcionales que pueden habilitarse/deshabilitarse por empresa.
 */
public enum ModuleType {
  /**
   * Sincronización cloud de operaciones.
   */
  CLOUD_SYNC,

  /**
   * Dashboard web de analytics.
   */
  DASHBOARD,

  /**
   * Soporte multi-sede.
   */
  MULTI_LOCATION,

  /**
   * Notificaciones WhatsApp.
   */
  WHATSAPP_NOTIFICATIONS,

  /**
   * Facturación electrónica (DIAN Colombia).
   */
  ELECTRONIC_INVOICING,

  /**
   * Auditoría avanzada y logs detallados.
   */
  ADVANCED_AUDIT,

  /**
   * Monitoreo en tiempo real.
   */
  REALTIME_MONITORING,

  /**
   * Reportes personalizados y exportación avanzada.
   */
  CUSTOM_REPORTS,

  /**
   * API access para integraciones.
   */
  API_ACCESS,

  /**
   * Impresión térmica local (siempre habilitado en LOCAL).
   */
  LOCAL_PRINTING,

  /**
   * Backup automático cloud.
   */
  CLOUD_BACKUP,

  /**
   * Control de acceso con barreras/cámaras.
   */
  ACCESS_CONTROL
}
