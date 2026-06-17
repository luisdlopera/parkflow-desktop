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
public class ModuleConfigurationRequest {

  @Schema(description = "Enable Clients module", example = "true")
  private Boolean clientsEnabled;

  @Schema(description = "Enable Agreements module", example = "true")
  private Boolean agreementsEnabled;

  @Schema(description = "Enable Monthly Contracts module", example = "true")
  private Boolean monthlyEnabled;

  @Schema(description = "Enable Shifts tracking module", example = "true")
  private Boolean shiftsEnabled;

  @Schema(description = "Enable Cash management module", example = "true")
  private Boolean cashEnabled;

  @Schema(description = "Enable Advanced Audit module", example = "false")
  private Boolean advancedAuditEnabled;
}
