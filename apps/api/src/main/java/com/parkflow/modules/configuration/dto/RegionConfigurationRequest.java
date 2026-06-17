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
public class RegionConfigurationRequest {

  @NotBlank(message = "Country code is required")
  @Schema(description = "Country code (ISO 3166-1 alpha-2)", example = "CO")
  private String countryCode;

  @Schema(description = "Regex pattern for license plates", example = "^[A-Z]{3}[0-9]{3}$")
  private String platePattern;

  @Schema(description = "Comma-separated list of common plate prefixes", example = "SJM,CER,CDO")
  private String platePrefixes;

  @Schema(description = "Timezone for the region", example = "America/Bogota")
  private String timezone;
}
