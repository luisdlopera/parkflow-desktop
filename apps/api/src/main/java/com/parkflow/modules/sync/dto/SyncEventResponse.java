package com.parkflow.modules.sync.dto;

import com.parkflow.modules.sync.entity.SyncDirection;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SyncEventResponse(
    UUID id,
    String idempotencyKey,
    String eventType,
    String aggregateId,
    String payloadJson,
    SyncDirection direction,
    OffsetDateTime createdAt,
    OffsetDateTime syncedAt) {}
