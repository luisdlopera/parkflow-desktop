package com.parkflow.modules.cash.dto;

import jakarta.validation.constraints.Size;

public record CashCloseRequest(
    @Size(max = 4000) String closingNotes,
    @Size(max = 200) String closingWitnessName,
    @Size(max = 120) String closeIdempotencyKey) {}
