package com.parkflow.modules.customers.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClientRequest(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 40) String document,
    @Size(max = 30) String phone,
    @Email @Size(max = 120) String email
) {}
