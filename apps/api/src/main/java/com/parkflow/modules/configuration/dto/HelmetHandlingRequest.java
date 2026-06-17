package com.parkflow.modules.configuration.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HelmetHandlingRequest {

  @NotBlank(message = "Helmet handling mode is required")
  @Schema(description = "Helmet handling mode: LOCKERS, MANUAL, NONE", example = "LOCKERS")
  private String mode;

  @Schema(description = "Number of helmet lockers (only used if mode is LOCKERS)", example = "5")
  private Integer lockerCount;
}
