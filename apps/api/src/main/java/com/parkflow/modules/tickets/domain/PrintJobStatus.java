package com.parkflow.modules.tickets.domain;

public enum PrintJobStatus {
  CREATED,
  QUEUED,
  PROCESSING,
  SENT,
  ACKED,
  FAILED,
  DEAD_LETTER
}
