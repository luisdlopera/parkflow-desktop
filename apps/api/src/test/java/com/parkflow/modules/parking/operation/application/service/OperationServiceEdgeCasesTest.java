package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.repository.*;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidationResult;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OperationServiceEdgeCasesTest {

  @Mock private EntryValidationService entryValidation;
  @Mock private VehicleResolverService vehicleResolver;
  @Mock private TicketNumberService ticketNumbers;
  @Mock private AppUserPort appUserRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private CustodiedItemPort custodiedItemRepository;
  @Mock private com.parkflow.modules.parking.locker.domain.repository.LockerPort lockerPort;
  @Mock private OperationPrintService operationPrintService;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private com.parkflow.modules.licensing.domain.repository.CompanyPort companyRepository;
  @Mock private ApplicationEventPublisher eventPublisher;

  private RegisterEntryService registerEntryService;
  private final UUID companyId = UUID.randomUUID();
  private final UUID operatorId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    AuthPrincipal principal = new AuthPrincipal(
        operatorId, companyId, "operator@test.com", UserRole.OPERADOR.name(),
        java.util.List.of(new SimpleGrantedAuthority("ROLE_OPERADOR")));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);

    registerEntryService = new RegisterEntryService(
        entryValidation, vehicleResolver, ticketNumbers,
        appUserRepository, parkingSessionRepository, vehicleConditionReportRepository,
        operationIdempotencyRepository, custodiedItemRepository, lockerPort,
        operationPrintService, parkingSpaceService, companyRepository, eventPublisher,
        new SimpleMeterRegistry());

    com.parkflow.modules.licensing.domain.Company company = new com.parkflow.modules.licensing.domain.Company();
    company.setId(companyId);
    lenient().when(companyRepository.findById(any())).thenReturn(Optional.of(company));
    lenient().when(operationIdempotencyRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
    lenient().when(ticketNumbers.next(any(), any())).thenReturn("T-20260618-000001");
    lenient().when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());

    MasterVehicleType defaultType = new MasterVehicleType();
    defaultType.setCode("CAR"); defaultType.setActive(true); defaultType.setRequiresPlate(true);
    lenient().when(entryValidation.requireActiveVehicleType(anyString())).thenReturn(defaultType);
    lenient().when(entryValidation.validateAndNormalizePlate(anyString(), anyString(), anyString()))
        .thenReturn(PlateValidationResult.valid("ABC123"));
    lenient().when(entryValidation.isMonthlySubscriber(anyString(), any(), any())).thenReturn(false);

    Rate r = new Rate(); r.setName("R"); r.setActive(true);
    lenient().when(entryValidation.resolveRate(any(), anyString(), any(), any(), any())).thenReturn(r);

    Vehicle vehicle = new Vehicle(); vehicle.setType("CAR");
    lenient().when(vehicleResolver.resolveAndSave(anyString(), anyString(), any())).thenReturn(vehicle);

    lenient().when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      return s;
    });

    AppUser op = new AppUser();
    op.setId(operatorId); op.setName("Operator"); op.setActive(true);
    op.setRole(UserRole.CAJERO); op.setCompanyId(companyId);
    lenient().when(appUserRepository.findById(any(UUID.class))).thenReturn(Optional.of(op));
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void registerEntry_WithInvalidRate_ShouldThrowException() {
    EntryRequest request = new EntryRequest(
        "idemp-key", "ABC123", "CAR",
        null, null, null, null, null,
        operatorId,
        null, null, null, null, null, null, null, null,
        "OK",
        null, null);

    Mockito.doThrow(new OperationException(HttpStatus.BAD_REQUEST, "No se encontró tarifa aplicable"))
        .when(entryValidation).resolveRate(any(), anyString(), any(), any(), any());

    Throwable throwable = catchThrowable(() -> registerEntryService.execute(request));

    assertThat(throwable).isInstanceOf(OperationException.class);
    assertThat(throwable.getMessage()).contains("No se encontró tarifa aplicable");
  }
}
