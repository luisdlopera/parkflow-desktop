package com.parkflow.modules.configuration.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CashRegisterResponse(
    UUID id,
    String site,
    UUID siteId,
    String code,
    String name,
    String terminal,
    String label,
    UUID printerId,
    String printerName,
    UUID responsibleUserId,
    String responsibleUserName,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
