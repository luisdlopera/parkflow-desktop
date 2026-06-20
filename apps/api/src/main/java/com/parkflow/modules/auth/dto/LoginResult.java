package com.parkflow.modules.auth.dto;

public record LoginResult(
    LoginResponse response,
    String accessToken,
    String refreshToken
) {}
