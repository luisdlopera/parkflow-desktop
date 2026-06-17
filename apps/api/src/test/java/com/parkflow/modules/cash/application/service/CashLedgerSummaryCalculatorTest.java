package com.parkflow.modules.cash.application.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.CashMovementStatus;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class CashLedgerSummaryCalculatorTest {

  private final CashLedgerSummaryCalculator calculator = new CashLedgerSummaryCalculator();

  @Test
  void summarizes_posted_movements_by_method_and_type_and_diff() {
    CashSession s = new CashSession();
    s.setOpeningAmount(new BigDecimal("100.00"));
    s.setCountedAmount(new BigDecimal("150.00"));

    CashMovement m1 = new CashMovement();
    m1.setMovementType(CashMovementType.MANUAL_INCOME);
    m1.setPaymentMethod(com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH);
    m1.setAmount(new BigDecimal("30.00"));
    m1.setStatus(CashMovementStatus.POSTED);

    CashMovement m2 = new CashMovement();
    m2.setMovementType(CashMovementType.MANUAL_EXPENSE);
    m2.setPaymentMethod(com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH);
    m2.setAmount(new BigDecimal("10.00"));
    m2.setStatus(CashMovementStatus.POSTED);

    CashSummaryResponse res = calculator.summarize(s, List.of(m1, m2));

    // ledger = +30 -10 = 20, expected = opening(100) + ledger(20) = 120
    assertThat(res.expectedLedgerTotal()).isEqualByComparingTo(new BigDecimal("120.00"));
    assertThat(res.countedTotal()).isEqualByComparingTo(new BigDecimal("150.00"));
    assertThat(res.difference()).isEqualByComparingTo(new BigDecimal("30.00"));
    assertThat(res.totalsByPaymentMethod()).containsKey("CASH");
    assertThat(res.movementCount()).isEqualTo(2);
  }

  // ==================== BUG 1: BigDecimal Rounding Issues ====================

  @Test
  void summarize_rounding_precision_preserved() {
    // FAILING TEST: Rounding mode should be consistent (HALF_UP)
    CashSession s = new CashSession();
    s.setOpeningAmount(new BigDecimal("100.00"));
    s.setCountedAmount(new BigDecimal("110.00"));

    // 1000 movements of 0.01 each = 10.00 exactly
    // But without explicit rounding mode, could accumulate to 9.99...
    java.util.List<CashMovement> movements = new java.util.ArrayList<>();
    for (int i = 0; i < 100; i++) {
      CashMovement m = new CashMovement();
      m.setMovementType(CashMovementType.MANUAL_INCOME);
      m.setPaymentMethod(com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH);
      m.setAmount(new BigDecimal("0.10"));
      m.setStatus(CashMovementStatus.POSTED);
      movements.add(m);
    }

    CashSummaryResponse res = calculator.summarize(s, movements);

    // Expected = 100 + (100 * 0.10) = 100 + 10 = 110.00 exactly
    assertThat(res.expectedLedgerTotal())
        .isEqualByComparingTo(new BigDecimal("110.00"))
        .as("Rounding should be consistent (HALF_UP)");
    // Currently fails because no explicit rounding mode specified
  }

  @Test
  void summarize_voided_movements_excluded_from_breakdown() {
    // FAILING TEST: VOIDED movements should be excluded from byMethod/byType
    // but included in ledger calculation
    CashSession s = new CashSession();
    s.setOpeningAmount(new BigDecimal("100.00"));
    s.setCountedAmount(new BigDecimal("100.00"));

    CashMovement m1 = new CashMovement();
    m1.setMovementType(CashMovementType.MANUAL_INCOME);
    m1.setPaymentMethod(com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH);
    m1.setAmount(new BigDecimal("50.00"));
    m1.setStatus(CashMovementStatus.POSTED);

    CashMovement m2 = new CashMovement();
    m2.setMovementType(CashMovementType.MANUAL_INCOME);
    m2.setPaymentMethod(com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH);
    m2.setAmount(new BigDecimal("50.00"));
    m2.setStatus(CashMovementStatus.VOIDED); // This one is VOIDED

    CashSummaryResponse res = calculator.summarize(s, List.of(m1, m2));

    // Expected ledger should only include m1 (m2 is VOIDED, returns ZERO from ledgerContribution)
    assertThat(res.expectedLedgerTotal()).isEqualByComparingTo(new BigDecimal("150.00"));

    // But byPaymentMethod should also only have m1
    assertThat(res.totalsByPaymentMethod().get("CASH"))
        .isEqualByComparingTo(new BigDecimal("50.00"))
        .as("byPaymentMethod should exclude VOIDED movements");
    // Currently fails because ledgerContribution returns ZERO for VOIDED,
    // but if manually added, it's included in ledger calculation
  }

  @Test
  void summarize_null_counted_amount_returns_null_difference() {
    // FAILING TEST: When counted is null, difference should be null
    CashSession s = new CashSession();
    s.setOpeningAmount(new BigDecimal("100.00"));
    s.setCountedAmount(null); // Not yet counted

    CashMovement m1 = new CashMovement();
    m1.setMovementType(CashMovementType.MANUAL_INCOME);
    m1.setPaymentMethod(com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH);
    m1.setAmount(new BigDecimal("50.00"));
    m1.setStatus(CashMovementStatus.POSTED);

    CashSummaryResponse res = calculator.summarize(s, List.of(m1));

    assertThat(res.countedTotal()).isNull();
    assertThat(res.difference())
        .as("Difference should be null when counted is null")
        .isNull();
  }

  @Test
  void ledger_contribution_all_movement_types() {
    // FAILING TEST: Verify all movement types contribute correctly
    CashMovement parking = new CashMovement();
    parking.setMovementType(CashMovementType.PARKING_PAYMENT);
    parking.setAmount(new BigDecimal("100.00"));
    parking.setStatus(CashMovementStatus.POSTED);

    CashMovement manualExpense = new CashMovement();
    manualExpense.setMovementType(CashMovementType.MANUAL_EXPENSE);
    manualExpense.setAmount(new BigDecimal("50.00"));
    manualExpense.setStatus(CashMovementStatus.POSTED);

    CashMovement discount = new CashMovement();
    discount.setMovementType(CashMovementType.DISCOUNT);
    discount.setAmount(new BigDecimal("10.00"));
    discount.setStatus(CashMovementStatus.POSTED);

    CashMovement voidOffset = new CashMovement();
    voidOffset.setMovementType(CashMovementType.VOID_OFFSET);
    voidOffset.setAmount(new BigDecimal("-100.00")); // Already negated
    voidOffset.setStatus(CashMovementStatus.POSTED);

    assertThat(calculator.ledgerContribution(parking))
        .isEqualByComparingTo(new BigDecimal("100.00"))
        .as("PARKING_PAYMENT should be +amount");
    assertThat(calculator.ledgerContribution(manualExpense))
        .isEqualByComparingTo(new BigDecimal("-50.00"))
        .as("MANUAL_EXPENSE should be -amount");
    assertThat(calculator.ledgerContribution(discount))
        .isEqualByComparingTo(new BigDecimal("-10.00"))
        .as("DISCOUNT should be -amount");
    assertThat(calculator.ledgerContribution(voidOffset))
        .isEqualByComparingTo(new BigDecimal("-100.00"))
        .as("VOID_OFFSET with -amount should contribute -amount");
  }
}
