package com.parkflow.modules.auth.application.port.in;

import com.parkflow.modules.auth.dto.PasswordResetConfirmRequest;
import com.parkflow.modules.auth.dto.PasswordResetRequest;

public interface PasswordResetUseCase {
    void requestReset(PasswordResetRequest request);
    void confirmReset(PasswordResetConfirmRequest request);
}
