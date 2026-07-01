package com.parkflow.modules.auth.dto;

public record RefreshTokenResponse(String token, int expiresIn, int refreshAfter) {}
