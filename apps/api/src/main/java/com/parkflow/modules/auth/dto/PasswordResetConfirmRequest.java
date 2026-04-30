package com.parkflow.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetConfirmRequest(
    @NotBlank String token,
    @NotBlank @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres") String newPassword,
    String deviceId) {}
