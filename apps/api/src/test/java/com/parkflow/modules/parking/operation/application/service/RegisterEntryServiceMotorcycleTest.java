package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;

import com.parkflow.modules.parking.operation.domain.OperationIdempotency;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;

import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.TicketCounterPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.dto.CustodiedItemRequest;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidationResult;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import com.parkflow.modules.common.exception.OperationException;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.List;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RegisterEntryServiceMotorcycleTest {

  @Mock private AppUserRepository appUserRepository;
  @Mock private VehicleRepository vehicleRepository;
  @Mock private RateRepository rateRepository;
  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private TicketCounterPort ticketCounterRepository;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private OperationAuditService operationAuditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private PlateValidator plateValidator;
  @Mock private MonthlyContractRepository monthlyContractRepository;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private CustodiedItemPort custodiedItemRepository;
  @Mock private LockerPort lockerPort;
  @Mock private MasterVehicleTypePort masterVehicleTypePort;
  @Mock private com.parkflow.modules.licensing.domain.repository.CompanyPort companyRepository;
  @Mock private com.parkflow.modules.onboarding.application.service.CompanySettingsService companySettingsService;

  private RegisterEntryService service;
  private final UUID companyId = UUID.randomUUID();
  private final UUID operatorId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    AuthPrincipal principal = new AuthPrincipal(
        operatorId, companyId, "operator@test.com", UserRole.OPERADOR.name(),
        List.of(new SimpleGrantedAuthority("ROLE_OPERADOR")));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);

    service = new RegisterEntryService(
        appUserRepository, vehicleRepository, rateRepository, parkingSiteRepository, parkingSessionRepository,
        ticketCounterRepository, vehicleConditionReportRepository, operationIdempotencyRepository,
        operationAuditService, operationPrintService, plateValidator, monthlyContractRepository,
        parkingSpaceService, custodiedItemRepository, lockerPort, new ObjectMapper(), new SimpleMeterRegistry(),
        masterVehicleTypePort, companyRepository, companySettingsService, org.mockito.Mockito.mock(com.parkflow.modules.configuration.service.OperationalConfigurationService.class));

    Mockito.lenient().when(operationIdempotencyRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());

    com.parkflow.modules.licensing.domain.Company company = new com.parkflow.modules.licensing.domain.Company();
    company.setId(companyId);
    Mockito.lenient().when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    Mockito.lenient().when(companySettingsService.getSettingsOrDefault(company))
        .thenReturn(java.util.Map.of("tickets", java.util.Map.of("ticketPrefix", "T-")));

    MasterVehicleType motorcycleType = new MasterVehicleType();
    motorcycleType.setCode("MOTORCYCLE");
    motorcycleType.setActive(true);
    motorcycleType.setRequiresPlate(true);
    Mockito.lenient().when(masterVehicleTypePort.findByCode("MOTORCYCLE")).thenReturn(Optional.of(motorcycleType));
    MasterVehicleType defaultType = new MasterVehicleType();
    defaultType.setCode("CAR");
    defaultType.setActive(true);
    defaultType.setRequiresPlate(true);
    Mockito.lenient().when(masterVehicleTypePort.findByCode("CAR")).thenReturn(Optional.of(defaultType));

    Mockito.lenient().when(parkingSessionRepository.findActiveByPlateForUpdate(any(), anyString(), any())).thenReturn(Optional.empty());
    Mockito.lenient().when(vehicleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    Mockito.lenient().when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      return s;
    });
    Mockito.lenient().when(ticketCounterRepository.findByIdForUpdate(anyString())).thenReturn(Optional.empty());
    Mockito.lenient().when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    Mockito.lenient().when(custodiedItemRepository.findBySession(any())).thenReturn(java.util.Collections.emptyList());
    Mockito.lenient().when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(anyString(), any(), any())).thenReturn(Optional.empty());
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void execute_ShouldCreateMotorcycleEntry_WhenValidPlate() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(plateValidator.validatePlate("CO", "MOTORCYCLE", "ABC12D"))
        .thenReturn(PlateValidationResult.valid("ABC12D"));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate("MAIN", "MOTORCYCLE", companyId)).thenReturn(Optional.of(rate));

    EntryRequest req = new EntryRequest(
        "moto-valid-1", "ABC12D", "MOTORCYCLE", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "Moto en buen estado", null, "Sin novedades",
        List.of(), List.of());

    var res = service.execute(req);

    assertThat(res).isNotNull();
    assertThat(res.message()).contains("Ingreso registrado");
  }

  @Test
  void execute_ShouldRejectMotorcyclePlate_WhenTypeIsCar() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(plateValidator.validatePlate("CO", "CAR", "ABC12D"))
        .thenReturn(PlateValidationResult.invalid("ABC12D", "Parece que ingresaste una placa de moto."));

    EntryRequest req = new EntryRequest(
        "moto-cross-1", "ABC12D", "CAR", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "Moto errónea", null, "Sin novedades",
        List.of(), List.of());

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("Parece que ingresaste una placa de moto");
  }

  @Test
  void execute_ShouldRejectCarPlate_WhenTypeIsMotorcycle() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(plateValidator.validatePlate("CO", "MOTORCYCLE", "ABC123"))
        .thenReturn(PlateValidationResult.invalid("ABC123", "Parece que ingresaste una placa de carro."));

    EntryRequest req = new EntryRequest(
        "moto-cross-2", "ABC123", "MOTORCYCLE", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "Carro como moto", null, "Sin novedades",
        List.of(), List.of());

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("Parece que ingresaste una placa de carro");
  }

  @Test
  void execute_ShouldRejectNoPlate_WhenNoReasonProvided() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    MasterVehicleType type = new MasterVehicleType();
    type.setCode("MOTORCYCLE");
    type.setActive(true);
    type.setRequiresPlate(false);
    Mockito.when(masterVehicleTypePort.findByCode("MOTORCYCLE")).thenReturn(Optional.of(type));

    EntryRequest req = new EntryRequest(
        "moto-no-plate-1", null, "MOTORCYCLE", "CO", null, true, null,
        null, operatorId, null, "MAIN", null, null, null, null, "Sin placa", null, "Sin novedades",
        List.of(), List.of());

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("justificación");
  }

  @Test
  void execute_ShouldCreateMotorcycleEntry_WhenNoPlateWithReason() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    MasterVehicleType type = new MasterVehicleType();
    type.setCode("MOTORCYCLE");
    type.setActive(true);
    type.setRequiresPlate(false);
    Mockito.when(masterVehicleTypePort.findByCode("MOTORCYCLE")).thenReturn(Optional.of(type));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate("MAIN", "MOTORCYCLE", companyId)).thenReturn(Optional.of(rate));

    EntryRequest req = new EntryRequest(
        "moto-no-plate-2", null, "MOTORCYCLE", "CO", null, true, "Placa extraviada",
        null, operatorId, null, "MAIN", null, null, null, null, "Sin placa visible", null, "Sin novedades",
        List.of(), List.of());

    var res = service.execute(req);

    assertThat(res).isNotNull();
    assertThat(res.message()).contains("Ingreso registrado");
  }

  @Test
  void execute_ShouldRejectDuplicateHelmetIdentifier() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(plateValidator.validatePlate("CO", "MOTORCYCLE", "ABC12D"))
        .thenReturn(PlateValidationResult.valid("ABC12D"));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate("MAIN", "MOTORCYCLE", companyId)).thenReturn(Optional.of(rate));
    Mockito.when(custodiedItemRepository.existsActiveHelmetByIdentifierAndCompany("LOCKER-01", companyId)).thenReturn(true);

    EntryRequest req = new EntryRequest(
        "moto-helmet-dup", "ABC12D", "MOTORCYCLE", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "Moto con casco duplicado", null, "Sin novedades",
        List.of(), List.of(),
        List.of(new CustodiedItemRequest("LOCKER-01", null, null)));

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("ya está asignado");
  }

  @Test
  void execute_ShouldCreateEntry_WhenHelmetWithValidLocker() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(plateValidator.validatePlate("CO", "MOTORCYCLE", "ABC12D"))
        .thenReturn(PlateValidationResult.valid("ABC12D"));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate("MAIN", "MOTORCYCLE", companyId)).thenReturn(Optional.of(rate));
    Mockito.when(custodiedItemRepository.existsActiveHelmetByIdentifierAndCompany("LOCKER-01", companyId)).thenReturn(false);

    Locker locker = Locker.builder()
        .id(UUID.randomUUID())
        .code("LOCKER-01")
        .status(LockerStatus.DISPONIBLE)
        .build();
    Mockito.when(lockerPort.findByCompanyIdAndCode(companyId, "LOCKER-01")).thenReturn(Optional.of(locker));

    EntryRequest req = new EntryRequest(
        "moto-helmet-ok", "ABC12D", "MOTORCYCLE", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "Moto con casco", null, "Sin novedades",
        List.of(), List.of(),
        List.of(new CustodiedItemRequest("LOCKER-01", "Negro", null)));

    var res = service.execute(req);

    assertThat(res).isNotNull();
    assertThat(res.message()).contains("Ingreso registrado");
    Mockito.verify(lockerPort).save(any());
  }

  @Test
  void execute_ShouldReturnIdempotentReplay_WhenSameIdempotencyKey() {
    Vehicle replayVehicle = new Vehicle();
    replayVehicle.setType("MOTORCYCLE");
    ParkingSession session = ParkingSession.builder()
        .id(UUID.randomUUID()).ticketNumber("T-20260513-000001")
        .plate("ABC12D").companyId(companyId)
        .vehicle(replayVehicle).build();
    OperationIdempotency existing = new OperationIdempotency();
    existing.setIdempotencyKey("moto-idem-1");
    existing.setOperationType(com.parkflow.modules.parking.operation.domain.IdempotentOperationType.ENTRY);
    existing.setSession(session);
    Mockito.when(operationIdempotencyRepository.findByIdempotencyKey("moto-idem-1")).thenReturn(Optional.of(existing));

    EntryRequest req = new EntryRequest(
        "moto-idem-1", "ABC12D", "MOTORCYCLE", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "Idempotente", null, "Sin novedades",
        List.of(), List.of());

    var res = service.execute(req);

    assertThat(res).isNotNull();
    assertThat(res.message()).contains("idempotente");
  }

  @Test
  void execute_ShouldReject_WhenVehicleConditionIsEmpty() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(plateValidator.validatePlate("CO", "MOTORCYCLE", "ABC12D"))
        .thenReturn(PlateValidationResult.valid("ABC12D"));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate("MAIN", "MOTORCYCLE", companyId)).thenReturn(Optional.of(rate));

    EntryRequest req = new EntryRequest(
        "moto-cond-empty", "ABC12D", "MOTORCYCLE", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "Sin condicion", null, "",
        List.of(), List.of());

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("Debe registrar estado del vehículo");
  }

  @Test
  void execute_ShouldReject_WhenInactiveRateProvided() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(plateValidator.validatePlate("CO", "MOTORCYCLE", "ABC12D"))
        .thenReturn(PlateValidationResult.valid("ABC12D"));

    UUID rateId = UUID.randomUUID();
    Rate inactiveRate = new Rate();
    inactiveRate.setId(rateId);
    inactiveRate.setActive(false);
    inactiveRate.setCompanyId(companyId);
    Mockito.when(rateRepository.findByIdAndCompanyId(rateId, companyId)).thenReturn(Optional.of(inactiveRate));

    EntryRequest req = new EntryRequest(
        "moto-inactive-rate", "ABC12D", "MOTORCYCLE", "CO", null, false, null,
        rateId, operatorId, null, "MAIN", null, null, null, null, "Moto rate inactiva", null, "Sin novedades",
        List.of(), List.of());

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("Tarifa inactiva");
  }

  @Test
  void execute_ShouldReject_WhenPlateAlreadyActive() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(plateValidator.validatePlate("CO", "MOTORCYCLE", "DUP12M"))
        .thenReturn(PlateValidationResult.valid("DUP12M"));
    ParkingSession active = ParkingSession.builder()
        .id(UUID.randomUUID()).plate("DUP12M").companyId(companyId).build();
    Mockito.when(parkingSessionRepository.findActiveByPlateForUpdate(any(), anyString(), any())).thenReturn(Optional.of(active));

    EntryRequest req = new EntryRequest(
        "moto-dup-plate", "DUP12M", "MOTORCYCLE", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "Placa duplicada", null, "Sin novedades",
        List.of(), List.of());

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("ya tiene una sesión activa");
  }

  @Test
  void execute_ShouldCreateEntry_WhenValidMotorcyclePlateWithMixedCase() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(plateValidator.validatePlate("CO", "MOTORCYCLE", "xyz99z"))
        .thenReturn(PlateValidationResult.valid("XYZ99Z"));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate("MAIN", "MOTORCYCLE", companyId)).thenReturn(Optional.of(rate));

    EntryRequest req = new EntryRequest(
        "moto-lowercase", "xyz99z", "MOTORCYCLE", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "Moto minúscula", null, "Sin novedades",
        List.of(), List.of());

    var res = service.execute(req);

    assertThat(res).isNotNull();
    assertThat(res.message()).contains("Ingreso registrado");
  }

  @Test
  void execute_ShouldCreateEntry_WhenHelmetWithMultipleCustodiedItems() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(plateValidator.validatePlate("CO", "MOTORCYCLE", "ABC12D"))
        .thenReturn(PlateValidationResult.valid("ABC12D"));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate("MAIN", "MOTORCYCLE", companyId)).thenReturn(Optional.of(rate));
    Mockito.when(custodiedItemRepository.existsActiveHelmetByIdentifierAndCompany("LOCKER-01", companyId)).thenReturn(false);
    Mockito.when(custodiedItemRepository.existsActiveHelmetByIdentifierAndCompany("LOCKER-02", companyId)).thenReturn(false);
    Locker locker1 = Locker.builder().id(UUID.randomUUID()).code("LOCKER-01").status(LockerStatus.DISPONIBLE).build();
    Locker locker2 = Locker.builder().id(UUID.randomUUID()).code("LOCKER-02").status(LockerStatus.DISPONIBLE).build();
    Mockito.when(lockerPort.findByCompanyIdAndCode(companyId, "LOCKER-01")).thenReturn(Optional.of(locker1));
    Mockito.when(lockerPort.findByCompanyIdAndCode(companyId, "LOCKER-02")).thenReturn(Optional.of(locker2));
    Mockito.lenient().when(lockerPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

    EntryRequest req = new EntryRequest(
        "moto-2helmets", "ABC12D", "MOTORCYCLE", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "Dos cascos", null, "Sin novedades",
        List.of(), List.of(),
        List.of(
            new CustodiedItemRequest("LOCKER-01", "Negro", null),
            new CustodiedItemRequest("LOCKER-02", "Blanco", null)
        ));

    var res = service.execute(req);

    assertThat(res).isNotNull();
    assertThat(res.message()).contains("Ingreso registrado");
    Mockito.verify(lockerPort, Mockito.times(2)).save(any());
  }

  @Test
  void execute_ShouldReject_WhenRateNotFound() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(plateValidator.validatePlate("CO", "MOTORCYCLE", "ABC12D"))
        .thenReturn(PlateValidationResult.valid("ABC12D"));
    UUID rateId = UUID.randomUUID();
    Mockito.when(rateRepository.findByIdAndCompanyId(rateId, companyId)).thenReturn(Optional.empty());

    EntryRequest req = new EntryRequest(
        "moto-rate-missing", "ABC12D", "MOTORCYCLE", "CO", null, false, null,
        rateId, operatorId, null, "MAIN", null, null, null, null, "Moto sin tarifa", null, "Sin novedades",
        List.of(), List.of());

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(OperationException.class)
        .hasMessageContaining("Tarifa no encontrada");
  }

  private AppUser activeOperator() {
    AppUser operator = new AppUser();
    operator.setId(operatorId);
    operator.setName("Operator");
    operator.setEmail("operator@test.com");
    operator.setActive(true);
    operator.setRole(UserRole.OPERADOR);
    operator.setCompanyId(companyId);
    return operator;
  }

  private Rate activeRate() {
    Rate rate = new Rate();
    rate.setId(UUID.randomUUID());
    rate.setName("Moto Rate");
    rate.setVehicleType("MOTORCYCLE");
    rate.setActive(true);
    rate.setCompanyId(companyId);
    return rate;
  }
}
