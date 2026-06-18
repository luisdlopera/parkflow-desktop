package com.parkflow.modules.auth.application.port.in;

import com.parkflow.modules.auth.dto.LogoutRequest;

public interface LogoutUseCase {
    void logout(LogoutRequest request);
    void logoutAll();
    void logoutDevice(String deviceId);
}
