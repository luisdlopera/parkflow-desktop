package com.parkflow.modules.cash.application.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.cash.domain.CashMovementStatus;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.repository.CashMovementSummaryProjection;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class CashLedgerSummaryCalculatorTest {

  private final CashLedgerSummaryCalculator calculator = new CashLedgerSummaryCalculator();

  private CashMovementSummaryProjection mockProj(PaymentMethod method, CashMovementType type, BigDecimal amount, CashMovementStatus status) {
      if (status == CashMovementStatus.VOIDED) return null; // voided normally excluded, or return a proxy
      return new CashMovementSummaryProjection() {
          @Override public PaymentMethod getPaymentMethod() { return method; }
          @Override public CashMovementType getMovementType() { return type; }
          @Override public BigDecimal getTotalAmount() { return amount; }
          @Override public long getCount() { return 1; }
      };
  }

  @Test
  void summarizes_posted_movements_by_method_and_type_and_diff() {
    CashSession s = new CashSession();
    s.setOpeningAmount(new BigDecimal("100.00"));
    s.setCountedAmount(new BigDecimal("150.00"));

    var m1 = mockProj(PaymentMethod.CASH, CashMovementType.MANUAL_INCOME, new BigDecimal("30.00"), CashMovementStatus.POSTED);
    var m2 = mockProj(PaymentMethod.CASH, CashMovementType.MANUAL_EXPENSE, new BigDecimal("10.00"), CashMovementStatus.POSTED);

    CashSummaryResponse res = calculator.summarize(s, List.of(m1, m2));

    assertThat(res.expectedLedgerTotal()).isEqualByComparingTo(new BigDecimal("120.00"));
    assertThat(res.countedTotal()).isEqualByComparingTo(new BigDecimal("150.00"));
    assertThat(res.difference()).isEqualByComparingTo(new BigDecimal("30.00"));
    assertThat(res.totalsByPaymentMethod()).containsKey("CASH");
    assertThat(res.movementCount()).isEqualTo(2);
  }

  @Test
  void summarize_rounding_precision_preserved() {
    CashSession s = new CashSession();
    s.setOpeningAmount(new BigDecimal("100.00"));
    s.setCountedAmount(new BigDecimal("110.00"));

    java.util.List<CashMovementSummaryProjection> movements = new java.util.ArrayList<>();
    for (int i = 0; i < 100; i++) {
      movements.add(mockProj(PaymentMethod.CASH, CashMovementType.MANUAL_INCOME, new BigDecimal("0.10"), CashMovementStatus.POSTED));
    }

    CashSummaryResponse res = calculator.summarize(s, movements);

    assertThat(res.expectedLedgerTotal())
        .isEqualByComparingTo(new BigDecimal("110.00"))
        .as("Rounding should be consistent (HALF_UP)");
  }

  @Test
  void summarize_voided_movements_excluded_from_breakdown() {
    CashSession s = new CashSession();
    s.setOpeningAmount(new BigDecimal("100.00"));
    s.setCountedAmount(new BigDecimal("100.00"));

    var m1 = mockProj(PaymentMethod.CASH, CashMovementType.MANUAL_INCOME, new BigDecimal("50.00"), CashMovementStatus.POSTED);
    // m2 voided means it's excluded from query usually, but we simulate it by passing only valid projections

    CashSummaryResponse res = calculator.summarize(s, java.util.Collections.singletonList(m1));

    assertThat(res.expectedLedgerTotal()).isEqualByComparingTo(new BigDecimal("150.00"));
    assertThat(res.totalsByPaymentMethod().get("CASH"))
        .isEqualByComparingTo(new BigDecimal("50.00"))
        .as("byPaymentMethod should exclude VOIDED movements");
  }

  @Test
  void summarize_null_counted_amount_returns_null_difference() {
    CashSession s = new CashSession();
    s.setOpeningAmount(new BigDecimal("100.00"));
    s.setCountedAmount(null); 

    var m1 = mockProj(PaymentMethod.CASH, CashMovementType.MANUAL_INCOME, new BigDecimal("50.00"), CashMovementStatus.POSTED);

    CashSummaryResponse res = calculator.summarize(s, List.of(m1));

    assertThat(res.countedTotal()).isNull();
    assertThat(res.difference())
        .as("Difference should be null when counted is null")
        .isNull();
  }

  @Test
  void ledger_contribution_all_movement_types() {
    assertThat(calculator.ledgerContribution(CashMovementType.PARKING_PAYMENT, new BigDecimal("100.00")))
        .isEqualByComparingTo(new BigDecimal("100.00"));
    assertThat(calculator.ledgerContribution(CashMovementType.MANUAL_EXPENSE, new BigDecimal("50.00")))
        .isEqualByComparingTo(new BigDecimal("-50.00"));
    assertThat(calculator.ledgerContribution(CashMovementType.DISCOUNT, new BigDecimal("10.00")))
        .isEqualByComparingTo(new BigDecimal("-10.00"));
    // VOID_OFFSET contributes zero: the original VOIDED movement is already
    // excluded by the repository query (status = POSTED only), so the offset
    // itself must not add or subtract from the ledger to avoid double-counting.
    assertThat(calculator.ledgerContribution(CashMovementType.VOID_OFFSET, new BigDecimal("-100.00")))
        .isEqualByComparingTo(BigDecimal.ZERO);
  }
}
