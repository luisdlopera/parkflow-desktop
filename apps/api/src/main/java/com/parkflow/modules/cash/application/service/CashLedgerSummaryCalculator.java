package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.CashMovementStatus;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CashLedgerSummaryCalculator {

  private static final BigDecimal ZERO = new BigDecimal("0.00");
  private static final int SCALE = 2;
  private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

  public CashSummaryResponse summarize(CashSession session, List<CashMovement> movements) {
    BigDecimal ledger = movements.stream()
        .map(this::ledgerContribution)
        .reduce(ZERO, (a, b) -> a.add(b).setScale(SCALE, ROUNDING));
    BigDecimal opening = session.getOpeningAmount() != null ? session.getOpeningAmount() : ZERO;
    BigDecimal expected = opening.add(ledger).setScale(SCALE, ROUNDING);

    Map<String, BigDecimal> byMethod = new HashMap<>();
    Map<String, BigDecimal> byType = new HashMap<>();
    long posted = 0;
    for (CashMovement movement : movements) {
      if (movement.getStatus() != CashMovementStatus.POSTED) {
        continue;
      }
      posted++;
      BigDecimal contribution = ledgerContribution(movement);
      byMethod.merge(
          movement.getPaymentMethod().name(),
          contribution,
          (a, b) -> a.add(b).setScale(SCALE, ROUNDING));
      byType.merge(
          movement.getMovementType().name(),
          contribution,
          (a, b) -> a.add(b).setScale(SCALE, ROUNDING));
    }

    BigDecimal counted = session.getCountedAmount() != null ? session.getCountedAmount() : null;
    BigDecimal diff = counted != null ? counted.subtract(expected).setScale(SCALE, ROUNDING) : null;
    return new CashSummaryResponse(opening, expected, counted, diff, byMethod, byType, posted);
  }

  public BigDecimal ledgerContribution(CashMovement movement) {
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
