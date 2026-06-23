package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.domain.repository.AgreementPort;
import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import com.parkflow.modules.configuration.domain.repository.PrepaidBalancePort;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.domain.pricing.PricingCalculator;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ParkingPricingUseCaseImplTest {

  @Mock private MonthlyContractPort monthlyContractPort;
  @Mock private PrepaidBalancePort prepaidBalancePort;
  @Mock private PrepaidUseCase prepaidUseCase;
  @Mock private AgreementPort agreementPort;
  @Mock private PricingCalculator pricingCalculator;

  @InjectMocks private ParkingPricingUseCaseImpl useCase;

  private final UUID companyId = UUID.randomUUID();
  private ParkingSession session;
  private Rate rate;
  private OffsetDateTime entryAt;
  private OffsetDateTime exitAt;

  @BeforeEach
  void setUp() {
    entryAt = OffsetDateTime.parse("2023-10-01T10:00:00Z");
    exitAt = entryAt.plusHours(2);
    
    rate = new Rate();
    rate.setGraceMinutes(15);

    session = org.mockito.Mockito.mock(ParkingSession.class, org.mockito.Mockito.RETURNS_DEEP_STUBS);
    lenient().when(session.getCompanyId()).thenReturn(companyId);
    lenient().when(session.getEntryAt()).thenReturn(entryAt);
    when(session.getRate()).thenReturn(rate);
    lenient().when(session.getPlate()).thenReturn("ABC1234");
  }

  @Test
  void calculateComplexPrice_ThrowsIfRateNotSet() {
    when(session.getRate()).thenReturn(null);
    assertThatThrownBy(() -> useCase.calculateComplexPrice(session, exitAt, null, false, false))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("La sesión no tiene tarifa asignada");
  }

  @Test
  void calculateComplexPrice_MonthlyContract_ZeroCost() {
    when(monthlyContractPort.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
        eq("ABC1234"), any(), any(), eq(companyId)))
        .thenReturn(Optional.of(new com.parkflow.modules.configuration.domain.MonthlyContract()));

    PriceBreakdown res = useCase.calculateComplexPrice(session, exitAt, null, false, false);
    assertThat(res.subtotal()).isEqualByComparingTo(BigDecimal.ZERO);
    verify(session).setMonthlySession(true);
  }

  @Test
  void calculateComplexPrice_PrepaidDeduction() {
    PrepaidBalance balance = new PrepaidBalance();
    balance.setId(UUID.randomUUID());
    balance.setRemainingMinutes(60);
    when(prepaidBalancePort.findActiveByPlate(eq("ABC1234"), eq(exitAt), eq(companyId)))
        .thenReturn(List.of(balance));

    PriceBreakdown base = new PriceBreakdown(60, new BigDecimal("100"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("100"));
    when(pricingCalculator.calculate(eq(rate), anyLong(), eq(false))).thenReturn(base);

    PriceBreakdown res = useCase.calculateComplexPrice(session, exitAt, null, false, false);
    
    verify(prepaidUseCase).deduct(balance.getId(), 60);
    verify(session).setAppliedPrepaidMinutes(60);
    assertThat(res.subtotal()).isEqualByComparingTo(new BigDecimal("100"));
  }

  @Test
  void calculateComplexPrice_Agreement() {
    PriceBreakdown base = new PriceBreakdown(120, new BigDecimal("100"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("100"));
    when(pricingCalculator.calculate(eq(rate), anyLong(), eq(false))).thenReturn(base);

    Agreement ag = new Agreement();
    ag.setDiscountPercent(new BigDecimal("50"));
    ag.setCode("CORP"); // 50% discount
    when(agreementPort.findByCodeAndIsActiveTrueAndCompanyId(eq("CORP"), any())).thenReturn(Optional.of(ag));

    PriceBreakdown res = useCase.calculateComplexPrice(session, exitAt, "CORP", false, false);

    verify(session).setAgreementCode("CORP");
    assertThat(res.subtotal()).isEqualByComparingTo(new BigDecimal("100.00"));
    assertThat(res.total()).isEqualByComparingTo(new BigDecimal("50.00")); 
    assertThat(res.discount()).isEqualByComparingTo(new BigDecimal("50.00")); 
  }
}
