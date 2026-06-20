package com.parkflow.modules.auth.dto;

public record LoginResponse(
    AuthUserResponse user,
    SessionInfoResponse session,
    DeviceInfoResponse device,
    OfflineLeaseResponse offlineLease) {}
