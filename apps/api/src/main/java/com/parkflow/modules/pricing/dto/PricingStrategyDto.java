package com.parkflow.modules.pricing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PricingStrategyDto(
    @NotNull PricingStrategyType type,
    @NotBlank String label) {
  public enum PricingStrategyType {
    HOURLY,
    FRACTIONAL,
    DAILY,
    NIGHT,
    MIXED
  }
}
