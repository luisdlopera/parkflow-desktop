package com.parkflow.modules.reports.dto;

import java.util.List;

public record OccupancyResponse(
    long totalSpaces,
    long occupiedSpaces,
    long availableSpaces,
    double occupancyPercentage,
    List<OccupancyByTypeItem> byVehicleType) {}
