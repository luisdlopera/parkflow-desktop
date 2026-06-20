package com.parkflow.modules.licensing.dto;

import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CreateSubscriptionRequest(
    @NotNull UUID planId,
    OffsetDateTime startsAt,
    OffsetDateTime endsAt) {}
