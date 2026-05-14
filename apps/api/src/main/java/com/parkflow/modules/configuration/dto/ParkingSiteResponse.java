package com.parkflow.modules.configuration.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ParkingSiteResponse(
    UUID id,
    UUID companyId,
    String code,
    String name,
    String address,
    String city,
    String phone,
    String managerName,
    String timezone,
    String currency,
    int maxCapacity,
    boolean isActive,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
