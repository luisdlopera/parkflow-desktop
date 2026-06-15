package com.parkflow.modules.parking.helmet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HelmetTokenRequest(
    @NotBlank @Size(max = 20) String code,
    @Size(max = 100) String label) {}
