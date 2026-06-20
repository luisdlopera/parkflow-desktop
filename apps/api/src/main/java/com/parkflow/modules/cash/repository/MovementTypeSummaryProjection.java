package com.parkflow.modules.cash.repository;

import com.parkflow.modules.cash.domain.CashMovementType;
import java.math.BigDecimal;

public interface MovementTypeSummaryProjection {
    CashMovementType getMovementType();
    BigDecimal getTotalAmount();
    long getCount();
}
