package com.parkflow.modules.pricing.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;

public record PricingRatesDto(
    @DecimalMin(value = "0.0", inclusive = false) BigDecimal pricePerHour,
    @Min(1) Integer fractionMinutes,
    @DecimalMin(value = "0.0", inclusive = false) BigDecimal fractionPrice,
    @DecimalMin(value = "0.0", inclusive = false) BigDecimal dailyPrice,
    @DecimalMin(value = "0.0", inclusive = false) BigDecimal nightPrice) {}
