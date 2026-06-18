package com.parkflow.modules.auth.application.port.in;

import com.parkflow.modules.auth.dto.LoginRequest;
import com.parkflow.modules.auth.dto.LoginResponse;

public interface LoginUseCase {
    LoginResponse login(LoginRequest request);
}
