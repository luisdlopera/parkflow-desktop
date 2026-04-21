package com.parkflow.modules.parking.operation.dto;

import java.math.BigDecimal;

public record OperationResultResponse(
    String sessionId,
    ReceiptResponse receipt,
    String message,
    BigDecimal subtotal,
    BigDecimal surcharge,
    BigDecimal total) {}
