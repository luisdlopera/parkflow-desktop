package com.parkflow.modules.cash.dto;

import java.math.BigDecimal;

public record CashPolicyResponse(
    boolean requireOpenForPayment,
    boolean offlineCloseAllowed,
    BigDecimal offlineMaxManualMovement,
    String operationsHint,
    String resolvedForSite) {}
