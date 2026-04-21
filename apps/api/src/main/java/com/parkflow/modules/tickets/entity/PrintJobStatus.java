package com.parkflow.modules.tickets.entity;

public enum PrintJobStatus {
  CREATED,
  QUEUED,
  PROCESSING,
  SENT,
  ACKED,
  FAILED,
  DEAD_LETTER
}
