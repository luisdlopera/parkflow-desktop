package com.parkflow.modules.parking.operation.dto;

import java.math.BigDecimal;
import java.util.List;

public record MassExitResponse(
    int totalCandidates,
    int successCount,
    int failCount,
    int skippedCount,
    BigDecimal totalCharged,
    BigDecimal totalExempted,
    long durationMs,
    String batchId,
    List<MassExitItemResult> items) {}
