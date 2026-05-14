package com.parkflow.modules.parking.operation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.cash.service.CashService;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.UserRole;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.PaymentRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.repository.TicketCounterRepository;
import com.parkflow.modules.parking.operation.repository.VehicleConditionReportRepository;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import com.parkflow.modules.parking.operation.repository.OperationIdempotencyRepository;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OperationServiceEdgeCasesTest {

  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private AppUserRepository appUserRepository;
  @Mock private VehicleRepository vehicleRepository;
  @Mock private RateRepository rateRepository;
  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private PaymentRepository paymentRepository;
  @Mock private TicketCounterRepository ticketCounterRepository;
  @Mock private VehicleConditionReportRepository vehicleConditionReportRepository;
  @Mock private OperationIdempotencyRepository operationIdempotencyRepository;
  @Mock private OperationAuditService auditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private CashService cashService;
  @Mock private PricingCalculator pricingCalculator;
  @Mock private ObjectMapper objectMapper;
  @Mock private MeterRegistry meterRegistry;
  @Mock private com.parkflow.modules.parking.operation.validation.PlateValidator plateValidator;
  @Mock private com.parkflow.modules.configuration.repository.MonthlyContractRepository monthlyContractRepository;
  @Mock private com.parkflow.modules.configuration.repository.PrepaidBalanceRepository prepaidBalanceRepository;
  @Mock private com.parkflow.modules.configuration.repository.AgreementRepository agreementRepository;
  @Mock private com.parkflow.modules.configuration.service.PrepaidService prepaidService;
  @Mock private com.parkflow.modules.configuration.repository.OperationalParameterRepository operationalParameterRepository;
  @Mock private com.parkflow.modules.audit.service.AuditService globalAuditService;

  @InjectMocks
  private OperationService operationService;

  @Test
  void registerEntry_WithInvalidRate_ShouldThrowException() {
    EntryRequest request = new EntryRequest("idemp-key", "ABC123", "CAR", null, null, null, null, null, UUID.randomUUID(), null, null, null, null, null, null, null, null, null, null);

    AppUser operator = new AppUser();
    operator.setActive(true);
    operator.setRole(UserRole.CAJERO);
    Mockito.when(appUserRepository.findById(Mockito.any())).thenReturn(Optional.of(operator));
    Mockito.when(vehicleRepository.findByPlate(Mockito.any())).thenReturn(Optional.empty());
    Mockito.when(vehicleRepository.save(Mockito.any(Vehicle.class))).thenAnswer(invocation -> invocation.getArgument(0));
    Mockito.when(rateRepository.findFirstApplicableRate(Mockito.anyString(), Mockito.any())).thenReturn(Optional.empty());
    Mockito.when(plateValidator.validatePlate(Mockito.anyString(), Mockito.anyString(), Mockito.anyString())).thenReturn(com.parkflow.modules.parking.operation.validation.PlateValidationResult.valid("ABC123"));

    Throwable throwable = catchThrowable(() -> operationService.registerEntry(request));

    assertThat(throwable).isInstanceOf(OperationException.class);

    OperationException exception = (OperationException) throwable;
    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(exception.getMessage())
        .contains("No existe tarifa activa y aplicable ahora para este tipo de vehiculo y sede");
  }
}
