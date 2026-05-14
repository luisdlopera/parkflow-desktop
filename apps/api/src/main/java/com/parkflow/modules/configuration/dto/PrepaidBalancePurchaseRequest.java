package com.parkflow.modules.configuration.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record PrepaidBalancePurchaseRequest(
    @NotNull UUID packageId,
    @NotBlank @Size(max = 20) String plate,
    @Size(max = 120) String holderName) {}

