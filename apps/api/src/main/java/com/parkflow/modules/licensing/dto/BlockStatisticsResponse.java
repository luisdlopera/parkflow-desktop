package com.parkflow.modules.licensing.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import lombok.Builder;
import lombok.Data;

/**
 * DTO para estadísticas de bloqueos.
 */
@Data
@Builder
public class BlockStatisticsResponse {

  private OffsetDateTime periodStart;
  private OffsetDateTime periodEnd;

  private Integer totalBlockEvents;
  private Integer resolvedEvents;
  private Integer unresolvedEvents;
  private Double resolutionRate;

  private Map<String, Integer> blocksByReason;
}
