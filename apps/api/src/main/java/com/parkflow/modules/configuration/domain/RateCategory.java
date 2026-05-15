package com.parkflow.modules.configuration.domain;

/**
 * Categoría semántica de una tarifa.
 *
 * <ul>
 *   <li>{@link #STANDARD} – Tarifa ordinaria de parqueadero (flujo normal de entrada/salida).</li>
 *   <li>{@link #MONTHLY} – Mensualidad: asociada a una o varias placas con fecha de vigencia.</li>
 *   <li>{@link #AGREEMENT} – Convenio empresarial: descuento o cobro fijo para empresa.</li>
 *   <li>{@link #PREPAID} – Paquete prepagado: banco de horas comprado anticipadamente.</li>
 * </ul>
 */
public enum RateCategory {
  STANDARD,
  MONTHLY,
  AGREEMENT,
  PREPAID
}
