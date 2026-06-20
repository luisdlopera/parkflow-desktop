package com.parkflow.modules.auth.dto;

import com.parkflow.modules.auth.domain.UserRole;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProfileResponse(
    UUID id,
    String name,
    String email,
    String document,
    String phone,
    UserRole role,
    String site,
    String terminal,
    boolean active,
    boolean requirePasswordChange,
    OffsetDateTime lastAccessAt,
    OffsetDateTime passwordChangedAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
