package com.parkflow.modules.settings.dto;

import java.util.UUID;

public record VehicleTypeResponse(
    UUID id,
    String code,
    String name,
    String icon,
    String color,
    boolean isActive,
    boolean requiresPlate,
    boolean hasOwnRate,
    boolean quickAccess,
    boolean requiresPhoto,
    int displayOrder,
    java.time.OffsetDateTime createdAt,
    java.time.OffsetDateTime updatedAt) {}
