package com.parkflow.modules.tickets.dto;

import com.parkflow.modules.tickets.domain.PrintDocumentType;
import com.parkflow.modules.tickets.domain.PrintJobStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PrintJobResponse(
    UUID id,
    UUID sessionId,
    String ticketNumber,
    PrintDocumentType documentType,
    PrintJobStatus status,
    String idempotencyKey,
    String payloadHash,
    String terminalId,
    int attempts,
    String lastError,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
