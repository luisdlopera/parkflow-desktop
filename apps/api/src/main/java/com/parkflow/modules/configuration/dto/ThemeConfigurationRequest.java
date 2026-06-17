package com.parkflow.modules.configuration.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ThemeConfigurationRequest(
    @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "primaryColor debe ser un color HEX válido (#rrggbb)")
    String primaryColor,

    @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "secondaryColor debe ser un color HEX válido (#rrggbb)")
    String secondaryColor,

    @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "successColor debe ser un color HEX válido (#rrggbb)")
    String successColor,

    @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "warningColor debe ser un color HEX válido (#rrggbb)")
    String warningColor,

    @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "dangerColor debe ser un color HEX válido (#rrggbb)")
    String dangerColor,

    @NotBlank @Pattern(regexp = "^(light|dark|auto)$", message = "themeMode debe ser 'light', 'dark' o 'auto'")
    String themeMode
) {}
