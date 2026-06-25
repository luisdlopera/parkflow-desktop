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
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.repository.*;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.infrastructure.persistence.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidationResult;
import com.parkflow.modules.parking.spaces.application.service.ParkingSpaceService;
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
class RegisterEntryServiceValidationTest {

  @Mock private EntryValidationService entryValidation;
  @Mock private VehicleResolverService vehicleResolver;
  @Mock private TicketNumberService ticketNumbers;
  @Mock private AppUserPort appUserRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private CustodiedItemPort custodiedItemRepository;
  @Mock private LockerPort lockerPort;
  @Mock private OperationPrintService operationPrintService;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private com.parkflow.modules.licensing.domain.repository.CompanyPort companyRepository;
  @Mock private ApplicationEventPublisher eventPublisher;

  private RegisterEntryService service;
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

    service = new RegisterEntryService(
        entryValidation, vehicleResolver, ticketNumbers,
        appUserRepository, parkingSessionRepository, vehicleConditionReportRepository,
        operationIdempotencyRepository, custodiedItemRepository, lockerPort,
        operationPrintService, parkingSpaceService, companyRepository, eventPublisher,
        new SimpleMeterRegistry(), org.mockito.Mockito.mock(com.parkflow.modules.settings.domain.repository.ParkingParametersPort.class), org.mockito.Mockito.mock(com.parkflow.modules.support.domain.provider.MessagingProvider.class));

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

    Rate r = new Rate(); r.setName("R"); r.setActive(true);
    lenient().when(entryValidation.resolveRate(any(), anyString(), any(), any(), any())).thenReturn(r);

    Vehicle vehicle = new Vehicle(); vehicle.setType("CAR");
    lenient().when(vehicleResolver.resolveAndSave(anyString(), anyString(), any())).thenReturn(vehicle);

    lenient().when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      return s;
    });
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void execute_ShouldRejectInactiveOperator() {
    AppUser operator = activeOperator();
    operator.setActive(false);
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));

    Throwable thrown = catchThrowable(() -> service.execute(baseRequest()));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("Operador inactivo");
  }

  @Test
  void execute_ShouldRejectOperatorFromDifferentCompany() {
    AppUser operator = activeOperator();
    operator.setCompanyId(UUID.randomUUID());
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));

    Throwable thrown = catchThrowable(() -> service.execute(baseRequest()));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("Operador no pertenece a la empresa");
  }

  @Test
  void execute_ShouldRejectInactiveVehicleType() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.doThrow(new OperationException(HttpStatus.BAD_REQUEST, "Tipo de vehículo está inactivo"))
        .when(entryValidation).requireActiveVehicleType("CAR");

    Throwable thrown = catchThrowable(() -> service.execute(baseRequest()));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("Tipo de vehículo está inactivo");
  }

  @Test
  void execute_ShouldRejectUnknownVehicleType() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.doThrow(new OperationException(HttpStatus.BAD_REQUEST, "Tipo de vehículo no existe"))
        .when(entryValidation).requireActiveVehicleType("CAR");

    Throwable thrown = catchThrowable(() -> service.execute(baseRequest()));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("Tipo de vehículo no existe");
  }

  @Test
  void execute_ShouldRejectInactiveRateWhenRateIdProvided() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    UUID rateId = UUID.randomUUID();
    Mockito.doThrow(new OperationException(HttpStatus.BAD_REQUEST, "Tarifa inactiva"))
        .when(entryValidation).resolveRate(any(), anyString(), any(), any(), any());

    EntryRequest req = new EntryRequest("idemp-rate-inactive", "ABC123", "CAR", "CO", null, false, null,
        rateId, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("Tarifa inactiva");
  }

  @Test
  void execute_ShouldRejectVehicleAlreadyInside() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.doThrow(new OperationException(HttpStatus.CONFLICT, "El vehículo ya tiene una sesión activa"))
        .when(entryValidation).assertNoActiveDuplicate(anyString(), any());

    Throwable thrown = catchThrowable(() -> service.execute(baseRequest()));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("ya tiene una sesión activa");
  }

  @Test
  void execute_ShouldRejectNoPlateWithoutReason() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));

    EntryRequest req = new EntryRequest("idemp-no-plate", null, "CAR", "CO", null, true, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("ingreso sin placa requiere una justificación");
  }

  @Test
  void execute_ShouldRejectVehicleTypeThatDoesNotRequirePlate() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    MasterVehicleType bicycleType = new MasterVehicleType();
    bicycleType.setCode("BICYCLE"); bicycleType.setActive(true); bicycleType.setRequiresPlate(false);
    Mockito.when(entryValidation.requireActiveVehicleType("BICYCLE")).thenReturn(bicycleType);

    EntryRequest req = new EntryRequest("idemp-bike", "ABC123", "BICYCLE", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("El tipo de vehículo no admite placa");
  }

  private AppUser activeOperator() {
    AppUser operator = new AppUser();
    operator.setId(operatorId); operator.setName("Operator");
    operator.setEmail("operator@test.com"); operator.setActive(true);
    operator.setRole(UserRole.OPERADOR); operator.setCompanyId(companyId);
    return operator;
  }

  private EntryRequest baseRequest() {
    return new EntryRequest("idemp-base", "ABC123", "CAR", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());
  }
}
