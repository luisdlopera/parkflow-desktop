package com.parkflow.modules.cash.domain;

public enum CashMovementType {
  PARKING_PAYMENT,
  MANUAL_INCOME,
  MANUAL_EXPENSE,
  /** Retiro de efectivo (ej. entrega a tesorería) — debe distinguirse de egreso operativo para auditoría. */
  WITHDRAWAL,
  /** Devolución al cliente sobre cobros registrados — trazabilidad aparte del descuento comercial. */
  CUSTOMER_REFUND,
  VOID_OFFSET,
  DISCOUNT,
  ADJUSTMENT,
  LOST_TICKET_PAYMENT,
  REPRINT_FEE
}
