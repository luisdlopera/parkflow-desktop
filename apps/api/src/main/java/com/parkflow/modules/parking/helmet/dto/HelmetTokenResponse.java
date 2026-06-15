package com.parkflow.modules.parking.helmet.dto;

import java.util.UUID;

public record HelmetTokenResponse(
    UUID id,
    String code,
    String label,
    boolean isActive,
    boolean occupied) {}
