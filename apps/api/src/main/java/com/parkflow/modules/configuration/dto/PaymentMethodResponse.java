package com.parkflow.modules.configuration.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentMethodResponse(
    UUID id,
    String code,
    String name,
    boolean requiresReference,
    boolean isActive,
    int displayOrder,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
