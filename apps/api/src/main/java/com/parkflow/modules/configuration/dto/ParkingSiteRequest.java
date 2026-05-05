package com.parkflow.modules.configuration.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ParkingSiteRequest(
    @NotBlank @Size(max = 20) String code,
    @NotBlank @Size(max = 120) String name,
    @Size(max = 300) String address,
    @Size(max = 100) String city,
    @Size(max = 50) String phone,
    @Size(max = 150) String managerName,
    @NotBlank @Size(max = 50) String timezone,
    @NotBlank @Size(max = 10) String currency,
    boolean isActive) {}
