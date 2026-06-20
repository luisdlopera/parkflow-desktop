package com.parkflow.modules.licensing.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SubscriptionResponse(
    UUID id,
    UUID companyId,
    String companyName,
    UUID planId,
    String planName,
    String planCode,
    String status,
    OffsetDateTime startsAt,
    OffsetDateTime endsAt,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
