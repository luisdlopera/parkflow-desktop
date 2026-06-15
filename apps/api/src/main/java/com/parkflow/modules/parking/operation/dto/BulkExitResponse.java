package com.parkflow.modules.parking.operation.dto;

import java.math.BigDecimal;
import java.util.List;

public record BulkExitResponse(
    BigDecimal totalCharged,
    int successfulCount,
    int failedCount,
    List<OperationResultResponse> successfulReceipts,
    List<String> errors
) {}
