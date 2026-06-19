package com.parkflow.modules.licensing.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record PlanResponse(
    UUID id,
    String code,
    String name,
    String description,
    BigDecimal monthlyPrice,
    BigDecimal yearlyPrice,
    boolean isActive,
    Map<String, Boolean> features,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    OffsetDateTime deletedAt
) {}
