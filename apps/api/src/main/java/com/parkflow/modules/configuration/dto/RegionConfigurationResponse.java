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
public class RegionConfigurationResponse {

  @Schema(description = "Company ID")
  private String companyId;

  @Schema(description = "Country code")
  private String countryCode;

  @Schema(description = "License plate pattern regex")
  private String platePattern;

  @Schema(description = "Common plate prefixes")
  private String platePrefixes;

  @Schema(description = "Region timezone")
  private String timezone;
}
