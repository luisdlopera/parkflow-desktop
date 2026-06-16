package com.parkflow.modules.parking.locker.dto;

import com.parkflow.modules.parking.locker.domain.LockerStatus;
import jakarta.validation.constraints.Size;

public record PatchLockerRequest(
    @Size(max = 20) String code,
    @Size(max = 100) String label,
    Boolean isActive,
    LockerStatus status) {}
