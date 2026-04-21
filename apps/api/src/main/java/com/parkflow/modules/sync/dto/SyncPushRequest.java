package com.parkflow.modules.sync.dto;

import jakarta.validation.constraints.NotBlank;

public record SyncPushRequest(
    @NotBlank String idempotencyKey,
    @NotBlank String eventType,
    @NotBlank String aggregateId,
    @NotBlank String payloadJson) {}
