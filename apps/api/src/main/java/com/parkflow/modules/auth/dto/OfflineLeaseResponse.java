package com.parkflow.modules.auth.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OfflineLeaseResponse(
    UUID sessionId,
    UUID userId,
    String deviceId,
    OffsetDateTime issuedAt,
    OffsetDateTime expiresAt,
    int maxHours,
    List<String> restrictedActions) {}
