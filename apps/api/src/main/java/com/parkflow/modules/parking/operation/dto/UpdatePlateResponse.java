package com.parkflow.modules.parking.operation.dto;

import java.util.UUID;

public record UpdatePlateResponse(
    UUID sessionId,
    String newPlate,
    String message
) {
}
