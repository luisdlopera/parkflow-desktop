package com.parkflow.modules.licensing.dto;

import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

/**
 * DTO para eventos de bloqueo.
 */
@Data
@Builder
public class BlockEventDto {

  private UUID id;
  private String eventType;
  private String reasonCode;
  private String reasonDescription;
  private OffsetDateTime createdAt;
  private Boolean resolved;
  private OffsetDateTime resolvedAt;
  private String resolvedBy;
  private Boolean falsePositive;
}
