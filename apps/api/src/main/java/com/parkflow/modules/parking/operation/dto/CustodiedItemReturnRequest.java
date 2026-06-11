package com.parkflow.modules.parking.operation.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CustodiedItemReturnRequest(
    @NotNull UUID itemId,
    @NotNull UUID operatorUserId,
    String observations) {}
