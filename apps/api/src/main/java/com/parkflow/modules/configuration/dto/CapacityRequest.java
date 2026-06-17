package com.parkflow.modules.configuration.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CapacityRequest {

  @NotNull(message = "Total capacity is required")
  @Min(value = 1, message = "Capacity must be at least 1")
  @Schema(description = "Total parking spaces", example = "50")
  private Integer totalCapacity;

  @Schema(description = "Optional: Distribute capacity by vehicle type percentages", example = "{\"MOTORCYCLE\": 30, \"CAR\": 70}")
  private java.util.Map<String, Integer> capacityByType;
}
