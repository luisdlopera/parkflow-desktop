package com.parkflow.modules.parking.operation.domain;

public enum SessionEventType {
  ENTRY_RECORDED,
  EXIT_RECORDED,
  TICKET_REPRINTED,
  LOST_TICKET_MARKED,
  VEHICLE_CONDITION_MISMATCH,
  VOIDED
}
