package com.parkflow.modules.auth.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SessionInfoResponse(
    UUID sessionId,
    UUID userId,
    String deviceId,
    UUID tokenFamilyId,
    OffsetDateTime issuedAt,
    OffsetDateTime accessTokenExpiresAt,
    OffsetDateTime refreshTokenExpiresAt,
    OffsetDateTime lastSeenAt) {}
