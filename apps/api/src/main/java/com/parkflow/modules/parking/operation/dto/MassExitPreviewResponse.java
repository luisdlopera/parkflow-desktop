package com.parkflow.modules.parking.operation.dto;

import java.math.BigDecimal;
import java.util.List;

public record MassExitPreviewResponse(
    int totalCandidates,
    BigDecimal estimatedTotal,
    List<MassExitItemResult> items,
    List<String> warnings) {}
