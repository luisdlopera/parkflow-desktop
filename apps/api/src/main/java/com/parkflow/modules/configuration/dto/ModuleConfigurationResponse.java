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
public class ModuleConfigurationResponse {

  @Schema(description = "Company ID")
  private String companyId;

  @Schema(description = "Clients module enabled")
  private Boolean clientsEnabled;

  @Schema(description = "Agreements module enabled")
  private Boolean agreementsEnabled;

  @Schema(description = "Monthly Contracts module enabled")
  private Boolean monthlyEnabled;

  @Schema(description = "Shifts tracking module enabled")
  private Boolean shiftsEnabled;

  @Schema(description = "Cash management module enabled")
  private Boolean cashEnabled;

  @Schema(description = "Advanced Audit module enabled")
  private Boolean advancedAuditEnabled;

  @Schema(description = "Current license plan")
  private String licensePlan;
}
