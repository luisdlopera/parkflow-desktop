package com.parkflow.modules.auth.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DeviceInfoResponse(
    UUID id,
    String deviceId,
    String displayName,
    String platform,
    String fingerprint,
    boolean authorized,
    OffsetDateTime revokedAt,
    OffsetDateTime lastSeenAt) {}
