package com.parkflow.modules.auth.application.port.in;

import com.parkflow.modules.auth.dto.LoginRequest;
import com.parkflow.modules.auth.dto.LoginResult;

public interface LoginUseCase {
    LoginResult login(LoginRequest request);
}
