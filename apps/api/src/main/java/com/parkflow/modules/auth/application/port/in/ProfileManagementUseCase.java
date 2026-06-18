package com.parkflow.modules.auth.application.port.in;

import com.parkflow.modules.auth.dto.AuthUserResponse;
import com.parkflow.modules.auth.dto.ChangePasswordRequest;
import com.parkflow.modules.auth.dto.ProfileResponse;
import com.parkflow.modules.auth.dto.UpdateProfileRequest;

public interface ProfileManagementUseCase {
    AuthUserResponse me();
    ProfileResponse getProfile();
    ProfileResponse updateProfile(UpdateProfileRequest request);
    void changePassword(ChangePasswordRequest request);
}
