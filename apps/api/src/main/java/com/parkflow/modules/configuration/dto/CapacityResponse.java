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
public class CapacityResponse {

  @Schema(description = "Company ID")
  private String companyId;

  @Schema(description = "Total parking spaces", example = "50")
  private Integer totalCapacity;

  @Schema(description = "Number of active spaces")
  private Integer activeSpaces;

  @Schema(description = "Number of inactive spaces")
  private Integer inactiveSpaces;

  @Schema(description = "Capacity distribution by vehicle type")
  private java.util.Map<String, Integer> capacityByType;

  @Schema(description = "Enable capacity control by vehicle type", example = "true")
  private Boolean controlSlots;

  @Schema(description = "Allow the sum of capacityByType to be less than totalCapacity", example = "false")
  private Boolean allowLowerCapacity;
}
