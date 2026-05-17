package com.parkflow.modules.parking.operation;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.domain.repository.AgreementPort;
import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import com.parkflow.modules.configuration.domain.repository.PrepaidBalancePort;
import com.parkflow.modules.configuration.domain.Rate;
import com.parkflow.modules.configuration.domain.RateType;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.parking.operation.application.service.ComplexPricingService;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.common.exception.domain.*;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.domain.pricing.PricingCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ComplexPricingServiceTest {

  @Mock private MonthlyContractPort monthlyContractRepository;
  @Mock private PrepaidBalancePort prepaidBalanceRepository;
  @Mock private PrepaidUseCase prepaidUseCase;
  @Mock private AgreementPort agreementRepository;
  @Mock private PricingCalculator pricingCalculator;
  @Mock private AuditPort auditPort;

  private ComplexPricingService service;

  @BeforeEach
  void setUp() {
    service = new ComplexPricingService(
        monthlyContractRepository, prepaidBalanceRepository,
        prepaidUseCase, agreementRepository, pricingCalculator, auditPort);
  }

  // -----------------------------------------------------------------------
  // No rate → throws
  // -----------------------------------------------------------------------

  @Test
  void calculate_throwsWhenNoRate() {
    ParkingSession session = session(null);
    assertThatThrownBy(() -> service.calculate(session, OffsetDateTime.now(), null, false, false))
        .isInstanceOf(BusinessValidationException.class);
  }

  // -----------------------------------------------------------------------
  // Monthly contract → zero cost
  // -----------------------------------------------------------------------

  @Test
  void calculate_returnsZeroForMonthlySubscriber() {
    ParkingSession session = session(rate(60, BigDecimal.TEN));
    OffsetDateTime exitAt = OffsetDateTime.now();
    LocalDate today = exitAt.toLocalDate();

    when(monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            eq("ABC123"), eq(today), eq(today), eq(session.getCompanyId())))
        .thenReturn(Optional.of(new com.parkflow.modules.configuration.domain.MonthlyContract()));

    PriceBreakdown result = service.calculate(session, exitAt, null, false, false);

    assertThat(result.total()).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(session.isMonthlySession()).isTrue();
    verify(pricingCalculator, never()).calculate(any(), anyLong(), anyBoolean());
  }

  // -----------------------------------------------------------------------
  // Prepaid deduction
  // -----------------------------------------------------------------------

  @Test
  void calculate_appliesPrepaidDeduction() {
    OffsetDateTime entryAt = OffsetDateTime.now().minusMinutes(90);
    ParkingSession session = session(rate(0, BigDecimal.TEN)).toBuilder()
        .entryAt(entryAt)
        .companyId(UUID.randomUUID())
        .build();
    OffsetDateTime exitAt = OffsetDateTime.now();

    when(monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(any(), any(), any(), any()))
        .thenReturn(Optional.empty());

    PrepaidBalance balance = new PrepaidBalance();
    balance.setId(UUID.randomUUID());
    balance.setRemainingMinutes(30);
    when(prepaidBalanceRepository.findActiveByPlate(eq("ABC123"), eq(exitAt), any()))
        .thenReturn(List.of(balance));

    PriceBreakdown baseBreakdown =
        new PriceBreakdown(1, BigDecimal.valueOf(5), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(5));
    // After 30min deduction, 60min remain billable
    when(pricingCalculator.calculate(any(), eq(60L), eq(false))).thenReturn(baseBreakdown);
    when(agreementRepository.findByCodeAndIsActiveTrue(any(), any())).thenReturn(Optional.empty());

    PriceBreakdown result = service.calculate(session, exitAt, null, false, false);

    assertThat(result.deductedMinutes()).isEqualTo(30);
    assertThat(result.total()).isEqualByComparingTo(BigDecimal.valueOf(5));
    verify(prepaidUseCase).deduct(balance.getId(), 30);
  }

  // -----------------------------------------------------------------------
  // Dry run: no mutations
  // -----------------------------------------------------------------------

  @Test
  void calculate_dryRunDoesNotDeductPrepaid() {
    ParkingSession session = session(rate(0, BigDecimal.TEN)).toBuilder()
        .entryAt(OffsetDateTime.now().minusMinutes(60))
        .companyId(UUID.randomUUID())
        .build();
    OffsetDateTime exitAt = OffsetDateTime.now();

    when(monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(any(), any(), any(), any()))
        .thenReturn(Optional.empty());

    PrepaidBalance balance = new PrepaidBalance();
    balance.setId(UUID.randomUUID());
    balance.setRemainingMinutes(60);
    when(prepaidBalanceRepository.findActiveByPlate(eq("ABC123"), eq(exitAt), any()))
        .thenReturn(List.of(balance));

    PriceBreakdown baseBreakdown =
        new PriceBreakdown(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
    when(pricingCalculator.calculate(any(), eq(0L), anyBoolean())).thenReturn(baseBreakdown);
    when(agreementRepository.findByCodeAndIsActiveTrue(any(), any())).thenReturn(Optional.empty());

    service.calculate(session, exitAt, null, false, true); // dryRun = true

    verify(prepaidUseCase, never()).deduct(any(), anyInt());
  }

  // -----------------------------------------------------------------------
  // Agreement: percentage discount
  // -----------------------------------------------------------------------

  @Test
  void calculate_appliesAgreementPercentDiscount() {
    ParkingSession session = session(rate(0, BigDecimal.TEN)).toBuilder()
        .entryAt(OffsetDateTime.now().minusMinutes(60))
        .companyId(UUID.randomUUID())
        .build();
    OffsetDateTime exitAt = OffsetDateTime.now();

    when(monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(any(), any(), any(), any()))
        .thenReturn(Optional.empty());
    when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(Collections.emptyList());

    PriceBreakdown baseBreakdown =
        new PriceBreakdown(1, BigDecimal.valueOf(100), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(100));
    when(pricingCalculator.calculate(any(), anyLong(), anyBoolean())).thenReturn(baseBreakdown);

    Agreement agreement = new Agreement();
    agreement.setCode("CORP10");
    agreement.setDiscountPercent(BigDecimal.TEN); // 10%
    when(agreementRepository.findByCodeAndIsActiveTrue(eq("CORP10"), eq(session.getCompanyId())))
        .thenReturn(Optional.of(agreement));

    PriceBreakdown result = service.calculate(session, exitAt, "CORP10", false, false);

    // 100 - 10% = 90
    assertThat(result.discount()).isEqualByComparingTo(BigDecimal.TEN);
    assertThat(result.total()).isEqualByComparingTo(BigDecimal.valueOf(90));
  }

  // -----------------------------------------------------------------------
  // Agreement: flat rate
  // -----------------------------------------------------------------------

  @Test
  void calculate_appliesAgreementFlatAmount() {
    ParkingSession session = session(rate(0, BigDecimal.TEN)).toBuilder()
        .entryAt(OffsetDateTime.now().minusMinutes(60))
        .companyId(UUID.randomUUID())
        .build();
    OffsetDateTime exitAt = OffsetDateTime.now();

    when(monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(any(), any(), any(), any()))
        .thenReturn(Optional.empty());
    when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(Collections.emptyList());

    PriceBreakdown baseBreakdown =
        new PriceBreakdown(1, BigDecimal.valueOf(100), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(100));
    when(pricingCalculator.calculate(any(), anyLong(), anyBoolean())).thenReturn(baseBreakdown);

    Agreement agreement = new Agreement();
    agreement.setCode("FLAT5K");
    agreement.setFlatAmount(BigDecimal.valueOf(5000));
    when(agreementRepository.findByCodeAndIsActiveTrue(eq("FLAT5K"), eq(session.getCompanyId())))
        .thenReturn(Optional.of(agreement));

    PriceBreakdown result = service.calculate(session, exitAt, "FLAT5K", false, false);

    assertThat(result.total()).isEqualByComparingTo(BigDecimal.valueOf(5000));
  }

  // -----------------------------------------------------------------------
  // Courtesy pricing: VISITOR pays, non-VISITOR pays zero
  // -----------------------------------------------------------------------

  @Test
  void applyCourtesy_visitorPaysNormally() {
    ParkingSession session = session(null).toBuilder()
        .entryMode(EntryMode.VISITOR)
        .build();
    PriceBreakdown computed =
        new PriceBreakdown(1, BigDecimal.valueOf(20), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(20));

    PriceBreakdown result = service.applyCourtesy(session, computed, false);

    assertThat(result.total()).isEqualByComparingTo(BigDecimal.valueOf(20));
  }

  @Test
  void applyCourtesy_subscriberPaysZero() {
    ParkingSession session = session(null).toBuilder()
        .entryMode(EntryMode.SUBSCRIBER)
        .build();
    PriceBreakdown computed =
        new PriceBreakdown(1, BigDecimal.valueOf(20), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(20));

    PriceBreakdown result = service.applyCourtesy(session, computed, false);

    assertThat(result.total()).isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  void applyCourtesy_lostTicketSettlementIgnoresCourtesy() {
    ParkingSession session = session(null).toBuilder()
        .entryMode(EntryMode.SUBSCRIBER)
        .build();
    PriceBreakdown computed =
        new PriceBreakdown(1, BigDecimal.valueOf(20), BigDecimal.TEN, BigDecimal.ZERO, 0, BigDecimal.valueOf(30));

    PriceBreakdown result = service.applyCourtesy(session, computed, true);

    assertThat(result.total()).isEqualByComparingTo(BigDecimal.valueOf(30));
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private ParkingSession session(Rate rate) {
    Vehicle v = new Vehicle();
    v.setPlate("ABC123");
    v.setType("CAR");

    return ParkingSession.builder()
        .id(UUID.randomUUID())
        .plate("ABC123")
        .companyId(UUID.randomUUID())
        .entryAt(OffsetDateTime.now().minusMinutes(60))
        .entryMode(EntryMode.VISITOR)
        .vehicle(v)
        .rate(rate)
        .build();
  }

  private Rate rate(int graceMinutes, BigDecimal amount) {
    Rate r = new Rate();
    r.setId(UUID.randomUUID());
    r.setGraceMinutes(graceMinutes);
    r.setAmount(amount);
    r.setRateType(RateType.HOURLY);
    r.setFractionMinutes(60);
    r.setRoundingMode(RoundingMode.UP);
    r.setLostTicketSurcharge(BigDecimal.ZERO);
    return r;
  }
}
