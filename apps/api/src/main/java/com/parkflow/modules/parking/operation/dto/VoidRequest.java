package com.parkflow.modules.parking.operation.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record VoidRequest(
    @NotBlank String ticketNumber,
    @NotBlank String plate,
    @NotBlank String reason,
    UUID operatorUserId,
    String idempotencyKey
) {}
