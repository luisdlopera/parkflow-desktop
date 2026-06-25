package com.parkflow.config;

import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.cash")
public class CashModuleProperties {
  /** Si es false, los cobros de salida no exigen caja abierta (modo transicion / QA). */
  private boolean requireOpenForPayment = true;

  /** Permite que el cliente muestre flujo de cierre cuando esta offline (UI). */
  private boolean offlineCloseAllowed = false;

  /** Tope de movimiento manual cuando el cliente envia X-Parkflow-Offline: 1. */
  private BigDecimal offlineMaxManualMovement = new BigDecimal("500000.00");

  /** Mensaje de ayuda para operadores (expuesto en /cash/policy). */
  private String operationsHint =
      "Abra caja en el mismo terminal que el cobro; use parametros por sede para flexibilizar politicas.";

  /** Permite múltiples sesiones abiertas en la misma sede/parqueadero. */
  private boolean allowMultipleOpenSessions = true;

  /** Permite que un usuario tenga múltiples sesiones abiertas a la vez. */
  private boolean allowMultipleSessionsPerUser = false;

  /** Tolerancia máxima para diferencias de descuadre. */
  private BigDecimal maxDiscrepancyTolerance = new BigDecimal("2000.00");

  /** Habilita movimientos manuales (ingresos/retiros). */
  private boolean allowManualMovements = true;
}
