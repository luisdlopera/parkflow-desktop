package com.parkflow.modules.parking.operation.dto;

import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record BulkExitRequest(
    @NotEmpty(message = "Debe enviar al menos un ticket o placa") List<String> locators,
    @NotNull UUID operatorUserId,
    PaymentMethod paymentMethod,
    String agreementCode,
    String observations,
    UUID cashSessionId) {
}
