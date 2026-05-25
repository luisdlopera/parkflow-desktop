package com.parkflow.modules.parking.spaces.dto;

import jakarta.validation.constraints.Min;

public record ResizeCapacityRequest(@Min(0) int capacity) {}
