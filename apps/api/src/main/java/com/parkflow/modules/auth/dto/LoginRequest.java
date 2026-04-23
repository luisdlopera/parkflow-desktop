package com.parkflow.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @Email @NotBlank String email,
    @NotBlank String password,
    @NotBlank String deviceId,
    @NotBlank String deviceName,
    @NotBlank String platform,
    @NotBlank String fingerprint,
    Integer offlineRequestedHours) {}
