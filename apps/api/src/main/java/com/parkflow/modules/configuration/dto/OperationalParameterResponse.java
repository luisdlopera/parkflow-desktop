package com.parkflow.modules.configuration.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record OperationalParameterResponse(
    UUID id,
    UUID siteId,
    boolean allowEntryWithoutPrinter,
    boolean allowExitWithoutPayment,
    boolean allowReprint,
    boolean allowVoid,
    boolean requirePhotoEntry,
    boolean requirePhotoExit,
    int toleranceMinutes,
    int maxTimeNoCharge,
    String legalMessage,
    boolean offlineModeEnabled,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
