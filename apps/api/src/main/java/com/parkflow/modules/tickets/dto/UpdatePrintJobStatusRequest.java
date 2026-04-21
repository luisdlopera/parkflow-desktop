package com.parkflow.modules.tickets.dto;

import com.parkflow.modules.tickets.entity.PrintJobStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdatePrintJobStatusRequest(
    @NotBlank String idempotencyKey,
    @NotNull PrintJobStatus status,
    String errorMessage) {}
