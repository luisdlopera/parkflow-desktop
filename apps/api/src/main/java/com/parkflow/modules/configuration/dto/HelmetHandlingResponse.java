package com.parkflow.modules.configuration.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HelmetHandlingResponse {

  @Schema(description = "Company ID")
  private String companyId;

  @Schema(description = "Current helmet handling mode")
  private String currentMode;

  @Schema(description = "Number of active helmet lockers")
  private Integer activeLockerCount;

  @Schema(description = "Number of inactive helmet lockers")
  private Integer inactiveLockerCount;

  @Schema(description = "Number of lockers with usage history")
  private Long usedLockerCount;

  @Schema(description = "Is helmet mode editable (false if lockers have usage)")
  private Boolean isEditable;

  @Schema(description = "Reason if not editable")
  private String editabilityReason;
}
