package com.parkflow.modules.configuration.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PrepaidPackageResponse(
    UUID id,
    String name,
    int hoursIncluded,
    BigDecimal amount,
    String vehicleType,
    String site,
    UUID siteId,
    int expiresDays,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
