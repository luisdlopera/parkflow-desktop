package com.parkflow.modules.settings.dto;

import com.parkflow.modules.parking.operation.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Email @Size(max = 180) String email,
    @Size(max = 32) String document,
    @Size(max = 40) String phone,
    @NotNull UserRole role,
    @Size(max = 80) String site,
    @Size(max = 80) String terminal,
    boolean canVoidTickets,
    boolean canReprintTickets,
    boolean canCloseCash,
    boolean requirePasswordChange,
    @NotBlank @Size(min = 8, max = 120) String initialPassword) {}
