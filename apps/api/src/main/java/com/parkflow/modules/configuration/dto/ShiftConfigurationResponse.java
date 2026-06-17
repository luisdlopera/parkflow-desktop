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
public class ShiftConfigurationResponse {

  @Schema(description = "Company ID")
  private String companyId;

  @Schema(description = "Shift-based operations enabled", example = "true")
  private Boolean shiftsEnabled;

  @Schema(description = "Day shift start time", example = "06:00")
  private String dayShiftStart;

  @Schema(description = "Day shift end time", example = "18:00")
  private String dayShiftEnd;

  @Schema(description = "Night shift start time", example = "18:00")
  private String nightShiftStart;

  @Schema(description = "Night shift end time", example = "06:00")
  private String nightShiftEnd;
}
