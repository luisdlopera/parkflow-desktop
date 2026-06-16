package com.parkflow.modules.parking.locker.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BatchLockerRequest(
    @Size(max = 20) String prefix,
    @NotNull @Min(1) int start,
    @NotNull @Min(1) int end) {}
