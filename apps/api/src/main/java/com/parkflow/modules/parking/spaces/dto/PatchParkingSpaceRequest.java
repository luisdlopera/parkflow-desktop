package com.parkflow.modules.parking.spaces.dto;

import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceType;
import jakarta.validation.constraints.Size;

public record PatchParkingSpaceRequest(
    ParkingSpaceStatus status,
    @Size(max = 80) String label,
    ParkingSpaceType type) {}
