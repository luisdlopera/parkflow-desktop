package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.domain.repository.AgreementPort;
import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import com.parkflow.modules.configuration.domain.repository.PrepaidBalancePort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.EntryMode;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.domain.pricing.PricingCalculator;
import com.parkflow.modules.parking.operation.domain.pricing.RateWindowResolver;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ComplexPricingServiceTest {

    @Mock private MonthlyContractPort monthlyContractRepository;
    @Mock private PrepaidBalancePort prepaidBalanceRepository;
    @Mock private PrepaidUseCase prepaidUseCase;
    @Mock private AgreementPort agreementRepository;
    @Mock private PricingCalculator pricingCalculator;
    @Mock private AuditPort auditPort;
    @Mock private RateWindowResolver rateWindowResolver;

    @InjectMocks
    private ComplexPricingService service;

    private Rate rate;
    private ParkingSession session;
    private final UUID companyId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        rate = new Rate();
        rate.setId(UUID.randomUUID());
        rate.setCompanyId(companyId);
        rate.setName("Tarifa Hora");
        rate.setRateType(RateType.HOURLY);
        rate.setAmount(new BigDecimal("2000.00"));
        rate.setGraceMinutes(0);
        rate.setActive(true);

        session = ParkingSession.builder()
            .id(UUID.randomUUID())
            .companyId(companyId)
            .ticketNumber("TEST-001")
            .plate("ABC123")
            .rate(rate)
            .entryAt(OffsetDateTime.now().minusHours(2))
            .entryMode(EntryMode.VISITOR)
            .status(com.parkflow.modules.parking.operation.domain.SessionStatus.ACTIVE)
            .build();
    }

    @Nested
    class ThrowsWhenNoRate {
        @Test
        void throwsWhenSessionHasNullRate() {
            session.setRate(null);
            OffsetDateTime exitAt = OffsetDateTime.now();

            assertThatThrownBy(() -> service.calculate(session, exitAt, null, false, false))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("no tiene tarifa");
        }
    }

    @Nested
    class MonthlyContractPath {
        @Test
        void returnsZeroCostWhenActiveMonthlyContract() {
            OffsetDateTime exitAt = OffsetDateTime.now();
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    eq("ABC123"), any(LocalDate.class), any(LocalDate.class), eq(companyId)))
                .thenReturn(Optional.of(new com.parkflow.modules.configuration.domain.MonthlyContract()));

            PriceBreakdown result = service.calculate(session, exitAt, null, false, false);

            assertThat(result.total()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(result.subtotal()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(session.isMonthlySession()).isTrue();
            // No debe llamar al calculador de tarifas
            verifyNoInteractions(pricingCalculator);
        }

        @Test
        void dryRunDoesNotMarkSessionAsMonthly() {
            OffsetDateTime exitAt = OffsetDateTime.now();
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any()))
                .thenReturn(Optional.of(new com.parkflow.modules.configuration.domain.MonthlyContract()));

            service.calculate(session, exitAt, null, false, true /* dryRun */);

            // En dryRun, no debe modificar el estado de la sesión
            assertThat(session.isMonthlySession()).isFalse();
        }

        @Test
        void chargesNormallyWhenNoMonthlyContract() {
            OffsetDateTime exitAt = OffsetDateTime.now();
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any()))
                .thenReturn(Optional.empty());
            when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(List.of());
            when(pricingCalculator.calculate(eq(rate), anyLong(), anyBoolean()))
                .thenReturn(new PriceBreakdown(2, new BigDecimal("4000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("4000")));
            when(rateWindowResolver.isInWindow(any(), any())).thenReturn(false);

            PriceBreakdown result = service.calculate(session, exitAt, null, false, false);

            assertThat(result.total()).isEqualByComparingTo(new BigDecimal("4000"));
            verify(pricingCalculator).calculate(eq(rate), anyLong(), eq(false));
        }
    }

    @Nested
    class PrepaidBalancePath {
        @Test
        void deductsPrepaidMinutesFromBillableDuration() {
            OffsetDateTime exitAt = session.getEntryAt().plusMinutes(90); // 90 min billable
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any())).thenReturn(Optional.empty());

            PrepaidBalance balance = new PrepaidBalance();
            balance.setId(UUID.randomUUID());
            balance.setRemainingMinutes(30); // 30 min prepaid

            when(prepaidBalanceRepository.findActiveByPlate(eq("ABC123"), any(), eq(companyId)))
                .thenReturn(List.of(balance));
            when(pricingCalculator.calculate(eq(rate), eq(60L), eq(false))) // 90 - 30 = 60
                .thenReturn(new PriceBreakdown(1, new BigDecimal("2000"), BigDecimal.ZERO, BigDecimal.ZERO, 30, new BigDecimal("2000")));
            when(rateWindowResolver.isInWindow(any(), any())).thenReturn(false);

            PriceBreakdown result = service.calculate(session, exitAt, null, false, false);

            verify(prepaidUseCase).deduct(balance.getId(), 30);
            assertThat(session.getAppliedPrepaidMinutes()).isEqualTo(30);
            // Calculator llamado con 60 minutos (90 - 30 prepaid)
            verify(pricingCalculator).calculate(eq(rate), eq(60L), eq(false));
        }

        @Test
        void skipsPrepaidDeductionOnLostTicket() {
            OffsetDateTime exitAt = session.getEntryAt().plusMinutes(60);
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any())).thenReturn(Optional.empty());
            when(pricingCalculator.calculate(eq(rate), anyLong(), eq(true)))
                .thenReturn(new PriceBreakdown(1, new BigDecimal("5000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("5000")));
            when(rateWindowResolver.isInWindow(any(), any())).thenReturn(false);

            service.calculate(session, exitAt, null, true /* lostTicket */, false);

            verifyNoInteractions(prepaidBalanceRepository);
            verifyNoInteractions(prepaidUseCase);
        }

        @Test
        void dryRunDoesNotCallDeduct() {
            OffsetDateTime exitAt = session.getEntryAt().plusMinutes(90);
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any())).thenReturn(Optional.empty());

            PrepaidBalance balance = new PrepaidBalance();
            balance.setId(UUID.randomUUID());
            balance.setRemainingMinutes(60);
            when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(List.of(balance));
            when(pricingCalculator.calculate(any(), anyLong(), anyBoolean()))
                .thenReturn(new PriceBreakdown(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO));
            when(rateWindowResolver.isInWindow(any(), any())).thenReturn(false);

            service.calculate(session, exitAt, null, false, true /* dryRun */);

            verify(prepaidUseCase, never()).deduct(any(), anyInt());
        }
    }

    @Nested
    class AgreementDiscountPath {
        @Test
        void appliesPercentageDiscountFromAgreement() {
            OffsetDateTime exitAt = session.getEntryAt().plusMinutes(60);
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any())).thenReturn(Optional.empty());
            when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(List.of());
            when(pricingCalculator.calculate(eq(rate), anyLong(), anyBoolean()))
                .thenReturn(new PriceBreakdown(1, new BigDecimal("10000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("10000")));
            when(rateWindowResolver.isInWindow(any(), any())).thenReturn(false);

            Agreement agreement = new Agreement();
            agreement.setCode("EMP01");
            agreement.setDiscountPercent(new BigDecimal("20")); // 20% descuento
            when(agreementRepository.findByCodeAndIsActiveTrue("EMP01", companyId))
                .thenReturn(Optional.of(agreement));

            PriceBreakdown result = service.calculate(session, exitAt, "EMP01", false, false);

            // 10000 - 20% = 8000
            assertThat(result.total()).isEqualByComparingTo(new BigDecimal("8000.00"));
            assertThat(result.discount()).isEqualByComparingTo(new BigDecimal("2000.00"));
        }

        @Test
        void appliesFlatAmountFromAgreement() {
            OffsetDateTime exitAt = session.getEntryAt().plusMinutes(60);
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any())).thenReturn(Optional.empty());
            when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(List.of());
            when(pricingCalculator.calculate(eq(rate), anyLong(), anyBoolean()))
                .thenReturn(new PriceBreakdown(1, new BigDecimal("10000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("10000")));
            when(rateWindowResolver.isInWindow(any(), any())).thenReturn(false);

            Agreement agreement = new Agreement();
            agreement.setCode("FLAT01");
            agreement.setFlatAmount(new BigDecimal("3000")); // tarifa plana
            when(agreementRepository.findByCodeAndIsActiveTrue("FLAT01", companyId))
                .thenReturn(Optional.of(agreement));

            PriceBreakdown result = service.calculate(session, exitAt, "FLAT01", false, false);

            assertThat(result.total()).isEqualByComparingTo(new BigDecimal("3000.00"));
        }

        @Test
        void ignoresAgreementWhenNotFound() {
            OffsetDateTime exitAt = session.getEntryAt().plusMinutes(60);
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any())).thenReturn(Optional.empty());
            when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(List.of());
            when(pricingCalculator.calculate(eq(rate), anyLong(), anyBoolean()))
                .thenReturn(new PriceBreakdown(1, new BigDecimal("5000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("5000")));
            when(rateWindowResolver.isInWindow(any(), any())).thenReturn(false);
            when(agreementRepository.findByCodeAndIsActiveTrue("INVALID", companyId))
                .thenReturn(Optional.empty());

            PriceBreakdown result = service.calculate(session, exitAt, "INVALID", false, false);

            assertThat(result.total()).isEqualByComparingTo(new BigDecimal("5000"));
        }

        @Test
        void usesAgreementCodeFromSessionWhenNotPassedExplicitly() {
            session.setAgreementCode("SESS_AGR");
            OffsetDateTime exitAt = session.getEntryAt().plusMinutes(60);
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any())).thenReturn(Optional.empty());
            when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(List.of());
            when(pricingCalculator.calculate(any(), anyLong(), anyBoolean()))
                .thenReturn(new PriceBreakdown(1, new BigDecimal("4000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("4000")));
            when(rateWindowResolver.isInWindow(any(), any())).thenReturn(false);

            Agreement agreement = new Agreement();
            agreement.setCode("SESS_AGR");
            agreement.setDiscountPercent(new BigDecimal("50"));
            when(agreementRepository.findByCodeAndIsActiveTrue("SESS_AGR", companyId))
                .thenReturn(Optional.of(agreement));

            PriceBreakdown result = service.calculate(session, exitAt, null, false, false);

            assertThat(result.total()).isEqualByComparingTo(new BigDecimal("2000.00"));
        }
    }

    @Nested
    class NightSurchargePath {
        @Test
        void appliesNightSurchargeWhenInWindow() {
            rate.setAppliesNight(true);
            rate.setNightSurchargePercent(new BigDecimal("20")); // 20% recargo nocturno
            OffsetDateTime exitAt = session.getEntryAt().plusMinutes(60);
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any())).thenReturn(Optional.empty());
            when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(List.of());
            when(pricingCalculator.calculate(eq(rate), anyLong(), anyBoolean()))
                .thenReturn(new PriceBreakdown(1, new BigDecimal("10000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("10000")));
            when(rateWindowResolver.isInWindow(eq(rate), eq(exitAt))).thenReturn(true);

            PriceBreakdown result = service.calculate(session, exitAt, null, false, false);

            // 10000 + 20% = 12000
            assertThat(result.total()).isEqualByComparingTo(new BigDecimal("12000.00"));
        }

        @Test
        void skipsNightSurchargeWhenOutsideWindow() {
            rate.setAppliesNight(true);
            rate.setNightSurchargePercent(new BigDecimal("20"));
            OffsetDateTime exitAt = session.getEntryAt().plusMinutes(60);
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any())).thenReturn(Optional.empty());
            when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(List.of());
            when(pricingCalculator.calculate(eq(rate), anyLong(), anyBoolean()))
                .thenReturn(new PriceBreakdown(1, new BigDecimal("10000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("10000")));
            when(rateWindowResolver.isInWindow(eq(rate), eq(exitAt))).thenReturn(false);

            PriceBreakdown result = service.calculate(session, exitAt, null, false, false);

            assertThat(result.total()).isEqualByComparingTo(new BigDecimal("10000.00"));
        }
    }

    @Nested
    class TaxCalculationPath {
        @Test
        void calculatesTaxExclusiveCorrectly() {
            rate.setTaxPercentage(new BigDecimal("19")); // IVA 19%
            rate.setTaxIncluded(false);
            OffsetDateTime exitAt = session.getEntryAt().plusMinutes(60);
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any())).thenReturn(Optional.empty());
            when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(List.of());
            when(pricingCalculator.calculate(eq(rate), anyLong(), anyBoolean()))
                .thenReturn(new PriceBreakdown(1, new BigDecimal("10000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("10000")));
            when(rateWindowResolver.isInWindow(any(), any())).thenReturn(false);

            PriceBreakdown result = service.calculate(session, exitAt, null, false, false);

            assertThat(result.taxPercentage()).isEqualByComparingTo(new BigDecimal("19"));
            assertThat(result.taxAmount()).isEqualByComparingTo(new BigDecimal("1900.00"));
            assertThat(result.total()).isEqualByComparingTo(new BigDecimal("11900.00"));
            assertThat(result.netAmount()).isEqualByComparingTo(new BigDecimal("10000.00"));
        }

        @Test
        void calculatesTaxInclusiveCorrectly() {
            rate.setTaxPercentage(new BigDecimal("19")); // IVA incluido
            rate.setTaxIncluded(true);
            OffsetDateTime exitAt = session.getEntryAt().plusMinutes(60);
            when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    any(), any(), any(), any())).thenReturn(Optional.empty());
            when(prepaidBalanceRepository.findActiveByPlate(any(), any(), any())).thenReturn(List.of());
            when(pricingCalculator.calculate(eq(rate), anyLong(), anyBoolean()))
                .thenReturn(new PriceBreakdown(1, new BigDecimal("11900"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("11900")));
            when(rateWindowResolver.isInWindow(any(), any())).thenReturn(false);

            PriceBreakdown result = service.calculate(session, exitAt, null, false, false);

            assertThat(result.total()).isEqualByComparingTo(new BigDecimal("11900"));
            // Con IVA incluido: netAmount = 11900 / 1.19 ≈ 10000
            assertThat(result.netAmount()).isEqualByComparingTo(new BigDecimal("10000.00"));
            assertThat(result.taxAmount()).isEqualByComparingTo(new BigDecimal("1900.00"));
        }
    }

    @Nested
    class ApplyCourtesyPath {
        @Test
        void returnsZeroForNonVisitorEntryMode() {
            session.setEntryMode(EntryMode.SUBSCRIBER);
            PriceBreakdown computed = new PriceBreakdown(1, new BigDecimal("5000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("5000"));

            PriceBreakdown result = service.applyCourtesy(session, computed, false);

            assertThat(result.total()).isEqualByComparingTo(BigDecimal.ZERO);
            verify(auditPort).record(any(), any(), any(), any(), any());
        }

        @Test
        void returnsOriginalForVisitorMode() {
            session.setEntryMode(EntryMode.VISITOR);
            PriceBreakdown computed = new PriceBreakdown(1, new BigDecimal("5000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("5000"));

            PriceBreakdown result = service.applyCourtesy(session, computed, false);

            assertThat(result.total()).isEqualByComparingTo(new BigDecimal("5000"));
            verifyNoInteractions(auditPort);
        }

        @Test
        void returnsOriginalOnLostTicketSettlement() {
            session.setEntryMode(EntryMode.EMPLOYEE);
            PriceBreakdown computed = new PriceBreakdown(1, new BigDecimal("20000"), BigDecimal.ZERO, BigDecimal.ZERO, 0, new BigDecimal("20000"));

            PriceBreakdown result = service.applyCourtesy(session, computed, true /* lostTicketSettlement */);

            // Tiquete perdido siempre cobra aunque no sea VISITOR
            assertThat(result.total()).isEqualByComparingTo(new BigDecimal("20000"));
            verifyNoInteractions(auditPort);
        }
    }
}
