package com.parkflow.modules.licensing.enums;

/**
 * Tipos de planes comerciales disponibles.
 * Define las capacidades y límites de cada cliente.
 */
public enum PlanType {
  /**
   * Plan Local - Opera 100% offline sin cloud.
   * Ideal para parqueaderos pequeños sin internet confiable.
   */
  LOCAL,

  /**
   * Plan Sync - Sincronización cloud + dashboard web.
   * Backup en la nube, reportes remotos.
   */
  SYNC,

  /**
   * Plan Pro - Multi-sede, auditoría completa, monitoreo avanzado.
   * Para cadenas de parqueaderos y operaciones empresariales.
   */
  PRO,

  /**
   * Plan Enterprise - Funcionalidades personalizadas, SLA garantizado.
   */
  ENTERPRISE
}
