package com.parkflow.modules.auth.application.port.in;

import com.parkflow.modules.auth.dto.AuthUserResponse;
import com.parkflow.modules.auth.dto.ChangePasswordRequest;
import com.parkflow.modules.auth.dto.LoginRequest;
import com.parkflow.modules.auth.dto.LoginResponse;
import com.parkflow.modules.auth.dto.LogoutRequest;
import com.parkflow.modules.auth.dto.RefreshRequest;

public interface AuthenticationUseCase {
    LoginResponse login(LoginRequest request);
    LoginResponse refresh(RefreshRequest request);
    void logout(LogoutRequest request);
    AuthUserResponse me();
    void changePassword(ChangePasswordRequest request);
}
