package com.parkflow.modules.parking.locker.dto;

import com.parkflow.modules.parking.locker.domain.LockerStatus;
import java.util.UUID;

public record LockerResponse(
    UUID id,
    String code,
    String label,
    LockerStatus status,
    boolean isActive,
    boolean occupied) {}
