package com.parkflow.modules.auth.dto;

public record LoginResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    AuthUserResponse user,
    SessionInfoResponse session,
    DeviceInfoResponse device,
    OfflineLeaseResponse offlineLease) {}
