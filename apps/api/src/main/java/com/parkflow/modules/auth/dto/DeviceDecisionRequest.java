package com.parkflow.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record DeviceDecisionRequest(@NotBlank String deviceId, @NotBlank String reason) {}
