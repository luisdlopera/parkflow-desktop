package com.parkflow.modules.auth.application.port.in;

import com.parkflow.modules.auth.dto.LoginResult;
import com.parkflow.modules.auth.dto.RefreshRequest;

public interface TokenRefreshUseCase {
    LoginResult refresh(RefreshRequest request, String refreshToken);
    LoginResult refreshFromCookie(String refreshToken);
}
