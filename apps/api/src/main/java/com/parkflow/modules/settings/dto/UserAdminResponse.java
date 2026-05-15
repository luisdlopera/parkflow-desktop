package com.parkflow.modules.settings.dto;

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
    boolean canVoidTickets,
    boolean canReprintTickets,
    boolean canCloseCash,
    boolean requirePasswordChange,
    OffsetDateTime lastAccessAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {}
