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
import com.parkflow.modules.cash.repository.CashMovementSummaryProjection;
import org.springframework.stereotype.Component;

@Component
public class CashLedgerSummaryCalculator {

  private static final BigDecimal ZERO = new BigDecimal("0.00");
  private static final int SCALE = 2;
  private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

  public CashSummaryResponse summarize(CashSession session, List<CashMovementSummaryProjection> projections) {
    BigDecimal ledger = ZERO;
    Map<String, BigDecimal> byMethod = new HashMap<>();
    Map<String, BigDecimal> byType = new HashMap<>();
    long posted = 0;

    for (CashMovementSummaryProjection p : projections) {
        BigDecimal amount = p.getTotalAmount() != null ? p.getTotalAmount() : ZERO;
        BigDecimal contribution = ledgerContribution(p.getMovementType(), amount);
        
        ledger = ledger.add(contribution).setScale(SCALE, ROUNDING);
        posted += p.getCount();
        
        byMethod.merge(
            p.getPaymentMethod().name(),
            contribution,
            (a, b) -> a.add(b).setScale(SCALE, ROUNDING));
        
        byType.merge(
            p.getMovementType().name(),
            contribution,
            (a, b) -> a.add(b).setScale(SCALE, ROUNDING));
    }

    BigDecimal opening = session.getOpeningAmount() != null ? session.getOpeningAmount() : ZERO;
    BigDecimal expected = opening.add(ledger).setScale(SCALE, ROUNDING);

    BigDecimal counted = session.getCountedAmount() != null ? session.getCountedAmount() : null;
    BigDecimal diff = counted != null ? counted.subtract(expected).setScale(SCALE, ROUNDING) : null;
    return new CashSummaryResponse(opening, expected, counted, diff, byMethod, byType, posted);
  }

  public BigDecimal ledgerContribution(com.parkflow.modules.cash.domain.CashMovementType type, BigDecimal amount) {
    return switch (type) {
      case PARKING_PAYMENT,
          MANUAL_INCOME,
          LOST_TICKET_PAYMENT,
          REPRINT_FEE,
          ADJUSTMENT -> amount;
      case MANUAL_EXPENSE, WITHDRAWAL, CUSTOMER_REFUND, DISCOUNT -> amount.negate();
      // VOID_OFFSET is a compensating entry; it nets to zero in the ledger
      case VOID_OFFSET -> BigDecimal.ZERO;
    };
  }
}
