package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import java.math.BigDecimal;

public interface CashMovementSummaryProjection {
    PaymentMethod getPaymentMethod();
    CashMovementType getMovementType();
    BigDecimal getTotalAmount();
    long getCount();
}
