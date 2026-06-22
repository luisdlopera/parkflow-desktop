package com.parkflow.modules.common.dto;

import jakarta.validation.constraints.NotNull;

public record RateStatusRequest(@NotNull Boolean active) {}
