package com.parkflow.modules.customers.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClientResponse(
    UUID id,
    UUID companyId,
    String name,
    String document,
    String phone,
    String email,
    boolean isActive,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
