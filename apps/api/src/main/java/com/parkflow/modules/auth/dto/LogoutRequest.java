package com.parkflow.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LogoutRequest(@NotBlank String sessionId, String refreshToken) {}
