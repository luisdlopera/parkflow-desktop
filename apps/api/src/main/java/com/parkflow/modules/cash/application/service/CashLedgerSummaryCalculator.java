package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.CashMovementStatus;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CashLedgerSummaryCalculator {

  private static final BigDecimal ZERO = new BigDecimal("0.00");

  public CashSummaryResponse summarize(CashSession session, List<CashMovement> movements) {
    BigDecimal ledger = movements.stream().map(this::ledgerContribution).reduce(ZERO, BigDecimal::add);
    BigDecimal opening = session.getOpeningAmount() != null ? session.getOpeningAmount() : ZERO;
    BigDecimal expected = opening.add(ledger);

    Map<String, BigDecimal> byMethod = new HashMap<>();
    Map<String, BigDecimal> byType = new HashMap<>();
    long posted = 0;
    for (CashMovement movement : movements) {
      if (movement.getStatus() != CashMovementStatus.POSTED) {
        continue;
      }
      posted++;
      BigDecimal contribution = ledgerContribution(movement);
      byMethod.merge(movement.getPaymentMethod().name(), contribution, BigDecimal::add);
      byType.merge(movement.getMovementType().name(), contribution, BigDecimal::add);
    }

    BigDecimal counted = session.getCountedAmount() != null ? session.getCountedAmount() : null;
    BigDecimal diff = counted != null ? counted.subtract(expected) : null;
    return new CashSummaryResponse(opening, expected, counted, diff, byMethod, byType, posted);
  }

  private BigDecimal ledgerContribution(CashMovement movement) {
    if (movement.getStatus() != CashMovementStatus.POSTED) {
      return ZERO;
    }
    return switch (movement.getMovementType()) {
      case PARKING_PAYMENT,
          MANUAL_INCOME,
          LOST_TICKET_PAYMENT,
          REPRINT_FEE,
          ADJUSTMENT -> movement.getAmount();
      case MANUAL_EXPENSE, WITHDRAWAL, CUSTOMER_REFUND, DISCOUNT -> movement.getAmount().negate();
      case VOID_OFFSET -> movement.getAmount();
    };
  }
}
