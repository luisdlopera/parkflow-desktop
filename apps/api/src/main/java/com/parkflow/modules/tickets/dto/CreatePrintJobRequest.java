package com.parkflow.modules.tickets.dto;

import com.parkflow.modules.tickets.domain.PrintDocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreatePrintJobRequest(
    @NotNull UUID sessionId,
    @NotNull UUID operatorUserId,
    @NotNull PrintDocumentType documentType,
    @NotBlank String idempotencyKey,
    @NotBlank String payloadHash,
    String ticketSnapshotJson,
    String terminalId) {}
