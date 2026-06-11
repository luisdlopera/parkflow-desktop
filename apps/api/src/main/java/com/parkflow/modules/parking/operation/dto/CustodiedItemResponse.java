package com.parkflow.modules.parking.operation.dto;

import com.parkflow.modules.parking.operation.domain.CustodiedItemStatus;
import com.parkflow.modules.parking.operation.domain.CustodiedItemType;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CustodiedItemResponse(
    UUID id,
    UUID sessionId,
    CustodiedItemType itemType,
    String identifier,
    CustodiedItemStatus status,
    String observations,
    String photoUrl,
    String receivedByName,
    OffsetDateTime receivedAt,
    String returnedByName,
    OffsetDateTime returnedAt) {}
