package com.parkflow.modules.sync.dto;

import com.parkflow.modules.sync.domain.SyncDirection;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SyncEventResponse(
    UUID id,
    String idempotencyKey,
    String eventType,
    String aggregateId,
    String payloadJson,
    String userId,
    String deviceId,
    String sessionId,
    String origin,
    SyncDirection direction,
    OffsetDateTime createdAt,
    OffsetDateTime syncedAt) {}
