package com.parkflow.modules.configuration.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ThemeConfigurationResponse(
    UUID id,
    UUID companyId,
    String primaryColor,
    String secondaryColor,
    String successColor,
    String warningColor,
    String dangerColor,
    String themeMode,
    String logoUrl,
    String faviconUrl,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
