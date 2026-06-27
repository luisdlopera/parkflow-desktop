package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.configuration.application.port.in.OperationalValidationUseCase;
import com.parkflow.modules.configuration.domain.MonthlyContract;
import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.infrastructure.persistence.BlacklistedPlateRepository;
import com.parkflow.modules.parking.operation.infrastructure.persistence.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.infrastructure.persistence.RateRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidationResult;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class EntryValidationServiceTest {

    @Mock private PlateValidator plateValidator;
    @Mock private MonthlyContractPort monthlyContractPort;
    @Mock private ParkingSitePort parkingSitePort;
    @Mock private MasterVehicleTypePort masterVehicleTypePort;
    @Mock private OperationalValidationUseCase operationalConfigurationService;
    @Mock private BlacklistedPlateRepository blacklistedPlateRepository;
    @Mock private RateRepository rateRepository;
    @Mock private ParkingSessionRepository parkingSessionRepository;

    @InjectMocks
    private EntryValidationService service;

    private final UUID companyId = UUID.randomUUID();

    @Nested
    class RequireActiveVehicleType {

        @Test
        void returnsVehicleTypeWhenActiveAndExists() {
            MasterVehicleType vt = new MasterVehicleType();
            vt.setCode("AUTO");
            vt.setActive(true);
            when(masterVehicleTypePort.findByCode("AUTO")).thenReturn(Optional.of(vt));

            MasterVehicleType result = service.requireActiveVehicleType("AUTO");

            assertThat(result.getCode()).isEqualTo("AUTO");
        }

        @Test
        void throwsWhenVehicleTypeNotFound() {
            when(masterVehicleTypePort.findByCode("UNKNOWN")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.requireActiveVehicleType("UNKNOWN"))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Tipo de vehículo no existe");
        }

        @Test
        void throwsWhenVehicleTypeInactive() {
            MasterVehicleType vt = new MasterVehicleType();
            vt.setCode("MOTO");
            vt.setActive(false);
            when(masterVehicleTypePort.findByCode("MOTO")).thenReturn(Optional.of(vt));

            assertThatThrownBy(() -> service.requireActiveVehicleType("MOTO"))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("inactivo");
        }
    }

    @Nested
    class ValidateAndNormalizePlate {

        @Test
        void returnsResultWhenPlateIsValid() {
            PlateValidationResult valid = PlateValidationResult.valid("ABC123");
            when(plateValidator.validatePlate("CO", "AUTO", "ABC123")).thenReturn(valid);

            PlateValidationResult result = service.validateAndNormalizePlate("CO", "AUTO", "ABC123");

            assertThat(result.isValid()).isTrue();
            assertThat(result.normalizedPlate()).isEqualTo("ABC123");
        }

        @Test
        void throwsWhenPlateIsInvalid() {
            PlateValidationResult invalid = PlateValidationResult.invalid("!!INVALID!!", "Formato inválido");
            when(plateValidator.validatePlate("CO", "AUTO", "!!INVALID!!")).thenReturn(invalid);

            assertThatThrownBy(() -> service.validateAndNormalizePlate("CO", "AUTO", "!!INVALID!!"))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Formato inválido");
        }
    }

    @Nested
    class AssertNoActiveDuplicate {

        @Test
        void passesWhenNoActiveDuplicate() {
            when(parkingSessionRepository.findActiveByPlateForUpdate(
                    SessionStatus.ACTIVE, "ABC123", companyId))
                .thenReturn(Optional.empty());

            // No debe lanzar excepción
            service.assertNoActiveDuplicate("ABC123", companyId);
        }

        @Test
        void throwsWhenDuplicateActiveSessionExists() {
            com.parkflow.modules.parking.operation.domain.ParkingSession existing =
                ParkingSession.builder()
                    .id(UUID.randomUUID())
                    .ticketNumber("T-DUP")
                    .companyId(companyId)
                    .status(SessionStatus.ACTIVE)
                    .build();
            when(parkingSessionRepository.findActiveByPlateForUpdate(
                    SessionStatus.ACTIVE, "ABC123", companyId))
                .thenReturn(Optional.of(existing));

            assertThatThrownBy(() -> service.assertNoActiveDuplicate("ABC123", companyId))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("sesión activa");
        }
    }

    @Nested
    class AssertNotBlacklisted {

        @Test
        void passesWhenPlateNotInBlacklist() {
            when(blacklistedPlateRepository.findByCompanyIdAndPlateIgnoreCaseAndActiveTrue(
                    companyId, "CLEAN01"))
                .thenReturn(Optional.empty());

            service.assertNotBlacklisted("CLEAN01", companyId);
        }

        @Test
        void throwsWhenPlateIsBlacklisted() {
            var blacklisted = new com.parkflow.modules.parking.operation.domain.BlacklistedPlate();
            blacklisted.setPlate("BAD001");
            blacklisted.setReason("Deuda pendiente");
            when(blacklistedPlateRepository.findByCompanyIdAndPlateIgnoreCaseAndActiveTrue(
                    companyId, "BAD001"))
                .thenReturn(Optional.of(blacklisted));

            assertThatThrownBy(() -> service.assertNotBlacklisted("BAD001", companyId))
                .isInstanceOf(OperationException.class)
                .satisfies(ex -> {
                    OperationException opEx = (OperationException) ex;
                    assertThat(opEx.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(opEx.getMessage()).contains("lista negra");
                    assertThat(opEx.getMessage()).contains("Deuda pendiente");
                });
        }

        @Test
        void throwsWithoutReasonWhenReasonIsBlank() {
            var blacklisted = new com.parkflow.modules.parking.operation.domain.BlacklistedPlate();
            blacklisted.setPlate("BAD002");
            blacklisted.setReason(""); // sin razón
            when(blacklistedPlateRepository.findByCompanyIdAndPlateIgnoreCaseAndActiveTrue(
                    companyId, "BAD002"))
                .thenReturn(Optional.of(blacklisted));

            assertThatThrownBy(() -> service.assertNotBlacklisted("BAD002", companyId))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("lista negra");
        }
    }

    @Nested
    class IsMonthlySubscriber {

        @Test
        void returnsTrueWhenActiveContractExists() {
            when(monthlyContractPort.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    eq("SUB001"), any(), any(), eq(companyId)))
                .thenReturn(Optional.of(new MonthlyContract()));

            assertThat(service.isMonthlySubscriber("SUB001", LocalDate.now(), companyId)).isTrue();
        }

        @Test
        void returnsFalseWhenNoActiveContract() {
            when(monthlyContractPort.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                    eq("VISITOR01"), any(), any(), eq(companyId)))
                .thenReturn(Optional.empty());

            assertThat(service.isMonthlySubscriber("VISITOR01", LocalDate.now(), companyId)).isFalse();
        }
    }

    @Nested
    class ResolveRate {

        @Test
        void resolvesRateByExplicitId() {
            Rate rate = buildRate();
            when(rateRepository.findByIdAndCompanyId(rate.getId(), companyId))
                .thenReturn(Optional.of(rate));

            Rate result = service.resolveRate(rate.getId(), "AUTO", "SEDE1", OffsetDateTime.now(), companyId);

            assertThat(result.getId()).isEqualTo(rate.getId());
        }

        @Test
        void resolvesDefaultRateWhenNoIdProvided() {
            Rate rate = buildRate();
            when(rateRepository.findFirstApplicableRate("SEDE1", "AUTO", companyId))
                .thenReturn(Optional.of(rate));

            Rate result = service.resolveRate(null, "AUTO", "SEDE1", OffsetDateTime.now(), companyId);

            assertThat(result.getId()).isEqualTo(rate.getId());
        }

        @Test
        void throwsWhenRateNotFoundById() {
            UUID fakeRateId = UUID.randomUUID();
            when(rateRepository.findByIdAndCompanyId(fakeRateId, companyId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.resolveRate(fakeRateId, "AUTO", "SEDE1", OffsetDateTime.now(), companyId))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Tarifa no encontrada");
        }

        @Test
        void throwsWhenNoApplicableRateForSite() {
            when(rateRepository.findFirstApplicableRate("SEDE1", "AUTO", companyId))
                .thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.resolveRate(null, "AUTO", "SEDE1", OffsetDateTime.now(), companyId))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("No se encontró tarifa");
        }

        @Test
        void throwsWhenRateIsInactive() {
            Rate rate = buildRate();
            rate.setActive(false);
            when(rateRepository.findByIdAndCompanyId(rate.getId(), companyId)).thenReturn(Optional.of(rate));

            assertThatThrownBy(() -> service.resolveRate(rate.getId(), "AUTO", "SEDE1", OffsetDateTime.now(), companyId))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("inactiva");
        }
    }

    @Nested
    class AssertCapacityAvailable {

        @Test
        void skipsCheckWhenSiteIsNull() {
            // No debe interactuar con el repositorio si site es null
            service.assertCapacityAvailable(null, companyId);
            verifyNoInteractions(parkingSitePort, parkingSessionRepository);
        }

        @Test
        void skipsCheckWhenSiteIsBlank() {
            service.assertCapacityAvailable("   ", companyId);
            verifyNoInteractions(parkingSitePort, parkingSessionRepository);
        }

        @Test
        void passesWhenCapacityNotConfigured() {
            var site = buildParkingSite(0 /* maxCapacity = 0 means unlimited */);
            when(parkingSitePort.findByCodeOrNameForUpdate("SEDE1", companyId))
                .thenReturn(Optional.of(site));

            service.assertCapacityAvailable("SEDE1", companyId);
            verifyNoInteractions(parkingSessionRepository);
        }

        @Test
        void passesWhenSiteExistsAndIsActive() {
            var site = buildParkingSite(10);
            when(parkingSitePort.findByCodeOrNameForUpdate("SEDE1", companyId))
                .thenReturn(Optional.of(site));

            service.assertCapacityAvailable("SEDE1", companyId);
            verify(parkingSitePort).findByCodeOrNameForUpdate("SEDE1", companyId);
        }

        @Test
        void throwsWhenSiteIsInactive() {
            var site = buildParkingSite(10);
            site.setActive(false);
            when(parkingSitePort.findByCodeOrNameForUpdate("SEDE1", companyId))
                .thenReturn(Optional.of(site));

            assertThatThrownBy(() -> service.assertCapacityAvailable("SEDE1", companyId))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("inactiva");
        }
    }

    // -------------------------------------------------------------------------

    private Rate buildRate() {
        Rate rate = new Rate();
        rate.setId(UUID.randomUUID());
        rate.setCompanyId(companyId);
        rate.setName("Tarifa Hora");
        rate.setRateType(RateType.HOURLY);
        rate.setAmount(new BigDecimal("2000"));
        rate.setActive(true);
        return rate;
    }

    private com.parkflow.modules.configuration.domain.ParkingSite buildParkingSite(int maxCapacity) {
        var site = new com.parkflow.modules.configuration.domain.ParkingSite();
        site.setId(UUID.randomUUID());
        site.setName("SEDE1");
        site.setMaxCapacity(maxCapacity);
        site.setActive(true);
        return site;
    }
}
