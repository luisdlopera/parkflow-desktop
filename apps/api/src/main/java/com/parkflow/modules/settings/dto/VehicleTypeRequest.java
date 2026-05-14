package com.parkflow.modules.settings.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VehicleTypeRequest(
    @NotBlank @Pattern(regexp = "^[A-Z0-9_]+$", message = "El código solo puede contener mayúsculas, números y guión bajo") String code,
    @NotBlank String name,
    @Size(max = 40) String icon,
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "El color debe ser hexadecimal, ejemplo #2563EB") String color,
    boolean requiresPlate,
    boolean hasOwnRate,
    boolean quickAccess,
    boolean requiresPhoto,
    int displayOrder) {}
