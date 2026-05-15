package com.parkflow.modules.settings.dto;

import com.parkflow.modules.auth.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UserPatchRequest(
    @Size(max = 120) String name,
    @Email @Size(max = 180) String email,
    @Size(max = 32) String document,
    @Size(max = 40) String phone,
    UserRole role,
    @Size(max = 80) String site,
    @Size(max = 80) String terminal,
    Boolean canVoidTickets,
    Boolean canReprintTickets,
    Boolean canCloseCash,
    Boolean requirePasswordChange) {}
