package com.parkflow.modules.settings.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VehicleTypeRequest(
    @NotBlank @Pattern(regexp = "^[A-Z0-9_]+$", message = "El código solo puede contener mayúsculas, números y guión bajo") String code,
    @NotBlank String name,
    boolean requiresPlate,
    boolean requiresPhoto,
    int displayOrder) {}
