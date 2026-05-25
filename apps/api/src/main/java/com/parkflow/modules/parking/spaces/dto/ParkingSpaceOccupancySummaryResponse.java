package com.parkflow.modules.parking.spaces.dto;

import java.util.UUID;

public record ParkingSpaceOccupancySummaryResponse(
    UUID companyId,
    long totalSpaces,
    long activeSpaces,
    long occupiedSpaces,
    long availableSpaces,
    long maintenanceSpaces,
    long inactiveSpaces,
    double occupancyPercentage) {}
