package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.parking.operation.dto.ExitRequest;
import com.parkflow.modules.parking.operation.domain.repository.PaymentPort;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.configuration.repository.PrepaidBalanceRepository;
import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.configuration.repository.AgreementRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.configuration.domain.repository.OperationalParameterPort;
import com.parkflow.modules.parking.operation.domain.pricing.PricingCalculator;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class RegisterExitServiceTest {

  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private PaymentPort paymentRepository;
  @Mock private AppUserRepository appUserRepository;
  @Mock private MonthlyContractRepository monthlyContractRepository;
  @Mock private PrepaidBalanceRepository prepaidBalanceRepository;
  @Mock private PrepaidUseCase prepaidUseCase;
  @Mock private AgreementRepository agreementRepository;
  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private OperationalParameterPort operationalParameterRepository;
  @Mock private PricingCalculator pricingCalculator;
  @Mock private OperationAuditService operationAuditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private AuditPort globalAuditService;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private CustodiedItemPort custodiedItemRepository;
  @Mock private ObjectMapper objectMapper;

  private RegisterExitService service;

  @BeforeEach
  void setUp() {
    SecurityContextHolder.getContext().setAuthentication(
        new TestingAuthenticationToken(new AuthPrincipal(UUID.randomUUID(), UUID.randomUUID(), "x", "ADMIN", List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))), null));

    service = new RegisterExitService(
        parkingSessionRepository, paymentRepository, appUserRepository, monthlyContractRepository,
        prepaidBalanceRepository, prepaidUseCase, agreementRepository, parkingSiteRepository,
        operationalParameterRepository, pricingCalculator, operationAuditService, operationPrintService,
        globalAuditService, vehicleConditionReportRepository, operationIdempotencyRepository,
        parkingSpaceService, custodiedItemRepository, objectMapper);
  }

  @Test
  void executeReturnsReplayWhenIdempotentExitExists() {
    String key = "idem-exit";
    Vehicle vehicle = new Vehicle();
    vehicle.setType("CAR");
    ParkingSession session = ParkingSession.builder()
        .id(UUID.randomUUID())
        .ticketNumber("T-200")
        .plate("XYZ")
        .companyId(UUID.randomUUID())
        .vehicle(vehicle)
        .entryAt(OffsetDateTime.now())
        .exitAt(OffsetDateTime.now().plusHours(1))
        .build();
    OperationIdempotency i = new OperationIdempotency();
    i.setIdempotencyKey(key);
    i.setOperationType(IdempotentOperationType.EXIT);
    i.setSession(session);
    when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(i));
    when(custodiedItemRepository.findBySession(session)).thenReturn(java.util.Collections.emptyList());

    ExitRequest req = new ExitRequest(key, null, null, null, null, null, null, null, null, null, null, null, null, null);
    var res = service.execute(req);

    assertThat(res).isNotNull();
    assertThat(res.message()).contains("idempotente");
  }
}
