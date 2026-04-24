package com.parkflow.modules.cash.dto;

import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

public record CashMovementRequest(
    @NotNull CashMovementType type,
    @NotNull PaymentMethod paymentMethod,
    @NotNull @DecimalMin("0.01") BigDecimal amount,
    UUID parkingSessionId,
    @Size(max = 2000) String reason,
    @Size(max = 4000) String metadataJson,
    @Size(max = 120) String externalReference,
    @Size(max = 120) String idempotencyKey) {}
