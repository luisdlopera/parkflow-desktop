package com.parkflow.modules.configuration.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PaymentMethodRequest(
    @NotBlank @Pattern(regexp = "^[A-Z0-9_]+$", message = "El código solo puede contener mayúsculas, números y guión bajo") @Size(max = 20) String code,
    @NotBlank @Size(max = 100) String name,
    boolean requiresReference,
    boolean isActive,
    int displayOrder) {}
