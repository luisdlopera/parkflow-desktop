package com.parkflow.modules.parking.operation.domain;

public enum IdempotentOperationType {
  ENTRY,
  EXIT,
  REPRINT,
  LOST_TICKET
}
