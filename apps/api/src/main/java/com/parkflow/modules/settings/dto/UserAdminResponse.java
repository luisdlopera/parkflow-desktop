package com.parkflow.modules.settings.dto;

import com.parkflow.modules.parking.operation.domain.UserRole;
import java.time.OffsetDateTime;
import java.util.UUID;

public record UserAdminResponse(
    UUID id,
    String name,
    String email,
    String document,
    String phone,
    UserRole role,
    String site,
    String terminal,
    boolean active,
    OffsetDateTime lastAccessAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
