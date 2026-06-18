package com.parkflow.modules.auth.application.port.in;

import com.parkflow.modules.auth.dto.LoginResponse;
import com.parkflow.modules.auth.dto.RefreshRequest;

public interface TokenRefreshUseCase {
    LoginResponse refresh(RefreshRequest request);
}
