package com.parkflow.modules.auth.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AuthUserResponse(
    UUID id,
    String name,
    String email,
    String role,
    List<String> permissions,
    boolean active,
    OffsetDateTime passwordChangedAt) {}
