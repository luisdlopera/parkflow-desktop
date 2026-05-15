package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.settings.dto.*;
import com.parkflow.modules.parking.operation.domain.UserRole;
import java.util.UUID;
import org.springframework.data.domain.Pageable;

public interface UserManagementUseCase {
    SettingsPageResponse<UserAdminResponse> list(String q, Boolean active, UserRole role, Pageable pageable);
    UserAdminResponse get(UUID id);
    UserAdminResponse create(UserCreateRequest req);
    UserAdminResponse patch(UUID id, UserPatchRequest req);
    UserAdminResponse patchStatus(UUID id, UserStatusRequest req);
    void resetPassword(UUID id, ResetPasswordRequest req);
}
