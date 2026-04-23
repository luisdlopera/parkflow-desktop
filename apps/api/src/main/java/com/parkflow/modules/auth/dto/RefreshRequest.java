package com.parkflow.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(@NotBlank String refreshToken, @NotBlank String deviceId) {}
