package com.parkflow.modules.configuration.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftConfigurationRequest {

  @NotNull(message = "Shift enabled flag is required")
  @Schema(description = "Enable shift-based operations", example = "true")
  private Boolean shiftsEnabled;

  @Pattern(regexp = "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", message = "Day shift start must be in HH:MM format")
  @Schema(description = "Day shift start time", example = "06:00")
  private String dayShiftStart;

  @Pattern(regexp = "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", message = "Day shift end must be in HH:MM format")
  @Schema(description = "Day shift end time", example = "18:00")
  private String dayShiftEnd;

  @Pattern(regexp = "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", message = "Night shift start must be in HH:MM format")
  @Schema(description = "Night shift start time", example = "18:00")
  private String nightShiftStart;

  @Pattern(regexp = "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$", message = "Night shift end must be in HH:MM format")
  @Schema(description = "Night shift end time", example = "06:00")
  private String nightShiftEnd;
}
