package com.parkflow.modules.settings.dto;

import jakarta.validation.constraints.NotNull;

public record RateStatusRequest(@NotNull Boolean active) {}
