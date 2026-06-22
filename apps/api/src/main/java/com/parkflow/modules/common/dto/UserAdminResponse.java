package com.parkflow.modules.common.dto;

import com.parkflow.modules.auth.domain.UserRole;
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
    boolean isBlocked,
    boolean requirePasswordChange,
    OffsetDateTime lastAccessAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
