package com.parkflow.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @NotBlank @Size(max = 120) String name,
    @NotBlank @Email @Size(max = 180) String email,
    @Size(max = 32) String document,
    @Size(max = 40) String phone,
    @Size(max = 80) String site,
    @Size(max = 80) String terminal) {}
