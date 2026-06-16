package com.parkflow.modules.parking.locker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LockerRequest(
    @NotBlank @Size(max = 20) String code,
    @Size(max = 100) String label) {}
