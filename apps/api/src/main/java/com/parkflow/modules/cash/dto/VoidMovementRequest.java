package com.parkflow.modules.cash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VoidMovementRequest(
    @NotBlank @Size(max = 2000) String reason, @Size(max = 120) String idempotencyKey) {}
