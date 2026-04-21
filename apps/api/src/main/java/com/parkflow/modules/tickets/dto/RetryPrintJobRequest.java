package com.parkflow.modules.tickets.dto;

import jakarta.validation.constraints.NotBlank;

public record RetryPrintJobRequest(@NotBlank String idempotencyKey, String reason) {}
