package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashMovementType;
import java.math.BigDecimal;

public interface MovementTypeSummaryProjection {
    CashMovementType getMovementType();
    BigDecimal getTotalAmount();
    long getCount();
}
