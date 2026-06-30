package com.parkflow.modules.pricing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import java.util.Map;

public record PricingRulesDto(
    @Min(0) int graceMinutes,
    @Min(0) int minimumChargeMinutes,
    @Valid RoundingDto rounding,
    @Valid SpecialHoursDto specialHours,
    @Valid WeekendsDto weekends,
    @Valid DailyCapsDto dailyCaps,
    Map<String, Object> vehicleOverrides) {

  public record RoundingDto(RoundingMode mode, @Min(1) Integer incrementMinutes) {
    public enum RoundingMode {
      NONE,
      UP,
      DOWN,
      NEAREST
    }
  }

  public record SpecialHoursDto(boolean enabled, String startTime, String endTime) {}

  public record WeekendsDto(boolean enabled, BigDecimal surchargePercent, BigDecimal fixedPrice) {}

  public record DailyCapsDto(boolean enabled, BigDecimal maxDailyPrice) {}
}
