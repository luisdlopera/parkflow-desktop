package com.parkflow.modules.cash.dto;

import java.util.UUID;

public record CashRegisterInfoResponse(UUID id, String site, String terminal, String label) {}
