package com.parkflow.modules.parking.spaces.dto;

import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceType;
import java.util.UUID;

public record ParkingSpaceDto(
    UUID id,
    String code,
    String label,
    ParkingSpaceType type,
    ParkingSpaceStatus status,
    int sortOrder,
    boolean occupied,
    UUID activeSessionId) {}
