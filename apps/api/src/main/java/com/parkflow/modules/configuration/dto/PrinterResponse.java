package com.parkflow.modules.configuration.dto;

import com.parkflow.modules.configuration.domain.Printer.PrinterConnection;
import com.parkflow.modules.configuration.domain.Printer.PrinterType;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PrinterResponse(
    UUID id,
    UUID siteId,
    String name,
    PrinterType type,
    PrinterConnection connection,
    int paperWidthMm,
    String endpointOrDevice,
    boolean isActive,
    boolean isDefault,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
