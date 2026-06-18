package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.cash.application.port.in.ParkingCashIntegrationUseCase;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.domain.repository.OperationalParameterPort;
import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;
import com.parkflow.modules.parking.operation.application.port.in.ParkingPricingUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.PaymentPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.dto.ExitRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.settings.application.port.in.ParkingParametersUseCase;
import com.parkflow.modules.settings.dto.ParkingParametersData;
import com.parkflow.modules.common.exception.OperationException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import com.parkflow.modules.configuration.domain.OperationalParameter;

@ExtendWith(MockitoExtension.class)
class RegisterExitServiceTest {

  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private PaymentPort paymentRepository;
  @Mock private AppUserPort appUserRepository;
  @Mock private ParkingSitePort parkingSitePort;
  @Mock private OperationalParameterPort operationalParameterRepository;
  @Mock private OperationAuditService operationAuditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private AuditPort globalAuditService;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private CustodiedItemPort custodiedItemRepository;
  @Mock private LockerPort lockerPort;
  @Mock private ParkingCashIntegrationUseCase parkingCashIntegrationUseCase;
  @Mock private ParkingParametersUseCase parkingParametersUseCase;
  @Mock private ParkingPricingUseCase parkingPricingUseCase;

  private RegisterExitService service;
  private final UUID companyId = UUID.randomUUID();
  private final UUID operatorId = UUID.randomUUID();
  private final UUID sessionId = UUID.randomUUID();
  private AppUser operator;
  private Vehicle vehicle;
  private Rate rate;
  private ParkingSession activeSession;

  @BeforeEach
  void setUp() {
    operator = new AppUser();
    operator.setId(operatorId);
    operator.setName("Operator");
    operator.setActive(true);
    operator.setRole(UserRole.CAJERO);
    operator.setCompanyId(companyId);

    vehicle = new Vehicle();
    vehicle.setId(UUID.randomUUID());
    vehicle.setPlate("ABC123");
    vehicle.setType("CAR");
    vehicle.setCompanyId(companyId);

    rate = new Rate();
    rate.setId(UUID.randomUUID());
    rate.setName("Standard Car");
    rate.setVehicleType("CAR");
    rate.setRateType(RateType.HOURLY);
    rate.setAmount(new BigDecimal("2000"));
    rate.setGraceMinutes(0);
    rate.setToleranceMinutes(0);
    rate.setFractionMinutes(60);
    rate.setRoundingMode(com.parkflow.modules.configuration.domain.RoundingMode.UP);
    rate.setLostTicketSurcharge(BigDecimal.ZERO);

    activeSession = ParkingSession.builder()
        .id(sessionId)
        .ticketNumber("T-100")
        .plate("ABC123")
        .companyId(companyId)
        .vehicle(vehicle)
        .rate(rate)
        .entryAt(OffsetDateTime.now().minusHours(2))
        .status(SessionStatus.ACTIVE)
        .site("Test Site")
        .syncStatus(SessionSyncStatus.SYNCED)
        .entryMode(EntryMode.VISITOR)
        .hasHelmet(false)
        .build();

    List<SimpleGrantedAuthority> setupAuths = List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
    AuthPrincipal principal = new AuthPrincipal(
        UUID.randomUUID(), companyId, "op@test.com", "ADMIN", setupAuths);
    org.springframework.security.core.context.SecurityContextHolder.getContext()
        .setAuthentication(new TestingAuthenticationToken(principal, null, setupAuths));

    service = new RegisterExitService(
        parkingSessionRepository, paymentRepository, appUserRepository, parkingSitePort,
        operationalParameterRepository,
        operationAuditService,
        operationPrintService,
        globalAuditService,
        vehicleConditionReportRepository,
        operationIdempotencyRepository,
        parkingSpaceService,
        custodiedItemRepository,
        lockerPort,
        parkingCashIntegrationUseCase,
        parkingParametersUseCase,
        parkingPricingUseCase);
  }

  private ExitRequest request(String ticket, String plate, PaymentMethod method) {
    return new ExitRequest("idem-key", ticket, plate, operatorId, method, null, null,
        "Salida de prueba", null, null, null, null, null, null, null);
  }

  private void mockSessionLookup() {
    when(parkingSessionRepository.findActiveByTicketForUpdate(
        eq(SessionStatus.ACTIVE), eq("T-100"), eq(companyId)))
        .thenReturn(Optional.of(activeSession));
  }

  private void mockOperator() {
    when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
  }

  private void mockPricing(PriceBreakdown breakdown) {
    when(parkingPricingUseCase.calculateComplexPrice(eq(activeSession), any(), any(), eq(false), eq(false))).thenReturn(breakdown);
    when(parkingPricingUseCase.applyCourtesyPricing(eq(activeSession), any(), eq(false))).thenAnswer(i -> i.getArgument(1));
  }

  private void mockIdempotency(boolean exists) {
    if (exists) {
      OperationIdempotency existing = new OperationIdempotency();
      existing.setIdempotencyKey("idem-key");
      existing.setOperationType(IdempotentOperationType.EXIT);
      existing.setSession(activeSession);
      activeSession.setExitAt(OffsetDateTime.now());
      activeSession.setStatus(SessionStatus.CLOSED);
      activeSession.setTotalAmount(BigDecimal.valueOf(4000));
      when(operationIdempotencyRepository.findByIdempotencyKey("idem-key"))
          .thenReturn(Optional.of(existing));
    } else {
      when(operationIdempotencyRepository.findByIdempotencyKey("idem-key"))
          .thenReturn(Optional.empty());
    }
  }



  private void mockParkingParams(boolean printExitTicket) {
    ParkingParametersData params = new ParkingParametersData();
    params.setPrintExitTicket(printExitTicket);
    when(parkingParametersUseCase.get(any())).thenReturn(params);
  }

  // =========================================================================
  // HAPPY PATH
  // =========================================================================

  @Nested
  class HappyPath {

    @Test
    void executesCarExitWithCashPayment() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, PaymentMethod.CASH));

      assertThat(result).isNotNull();
      assertThat(result.message()).contains("Salida registrada");
      assertThat(result.total()).isEqualByComparingTo(BigDecimal.valueOf(4000));
      assertThat(result.receipt().status()).isEqualTo(SessionStatus.CLOSED);
      verify(parkingSessionRepository).save(activeSession);
      verify(parkingCashIntegrationUseCase).assertCashOpenForParkingPayment(eq(activeSession), any());
      verify(parkingCashIntegrationUseCase).recordParkingPayment(any(), any(), eq(operator), any(), any(), any());
      verify(parkingSpaceService).releaseSpaceBySession(sessionId);
      verify(operationIdempotencyRepository).save(any());
    }

    @Test
    void executesMotorcycleExitWithCashPayment() {
      vehicle.setType("MOTORCYCLE");
      vehicle.setPlate("ABC12D");
      activeSession.setPlate("ABC12D");
      activeSession.setHasHelmet(false);
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(1, BigDecimal.valueOf(1500), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(1500)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, PaymentMethod.CASH));

      assertThat(result.total()).isEqualByComparingTo(BigDecimal.valueOf(1500));
      assertThat(result.receipt().vehicleType()).isEqualTo("MOTORCYCLE");
      assertThat(result.receipt().status()).isEqualTo(SessionStatus.CLOSED);
    }

    @Test
    void executesExitWithZeroTotalForCourtesy() {
      activeSession.setEntryMode(EntryMode.SUBSCRIBER);
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(0)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, null));

      assertThat(result.total()).isEqualByComparingTo(BigDecimal.ZERO);
      verify(paymentRepository, never()).save(any());
      verify(parkingCashIntegrationUseCase, never()).recordParkingPayment(any(), any(), any(), any(), any(), any());
    }

    @Test
    void executesExitWithMonthlyContract() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, null));

      assertThat(result.total()).isEqualByComparingTo(BigDecimal.ZERO);
      verify(parkingPricingUseCase).calculateComplexPrice(eq(activeSession), any(), any(), eq(false), eq(false));
    }

    @Test
    void executesExitWithAgreementDiscount() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      ExitRequest req = new ExitRequest("idem-key", "T-100", null, operatorId, null,
          "CORP10", null, "Salida", null, null, null, null, null, null, null);
      OperationResultResponse result = service.execute(req);

      assertThat(result.total()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void executesExitWithPrepaidMinutesDeduction() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.valueOf(3000), 30, BigDecimal.valueOf(1000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, PaymentMethod.CASH));

      assertThat(result.total()).isEqualByComparingTo(BigDecimal.valueOf(1000));
    }

    @Test
    void executesExitByPlate() {
      when(parkingSessionRepository.findActiveByPlateForUpdate(
          eq(SessionStatus.ACTIVE), eq("ABC123"), eq(companyId)))
          .thenReturn(Optional.of(activeSession));
      mockIdempotency(false);
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request(null, "ABC123", PaymentMethod.CASH));

      assertThat(result.receipt().plate()).isEqualTo("ABC123");
      assertThat(result.receipt().status()).isEqualTo(SessionStatus.CLOSED);
    }
  }

  // =========================================================================
  // VALIDATION ERRORS
  // =========================================================================

  @Nested
  class ValidationErrors {

    @Test
    void throwsWhenNoTicketAndNoPlate() {
      assertThatThrownBy(() -> service.execute(request(null, null, PaymentMethod.CASH)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("ticketNumber o plate es obligatorio");
    }

    @Test
    void throwsWhenSessionNotFound() {
      when(parkingSessionRepository.findActiveByTicketForUpdate(
          eq(SessionStatus.ACTIVE), eq("INVALID"), eq(companyId)))
          .thenReturn(Optional.empty());
      when(operationIdempotencyRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.execute(request("INVALID", null, PaymentMethod.CASH)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Sesión activa no encontrada");
    }

    @Test
    void throwsWhenRateMissing() {
      activeSession.setRate(null);
      mockIdempotency(false);
      mockSessionLookup();
      when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
      when(parkingPricingUseCase.calculateComplexPrice(eq(activeSession), any(), any(), eq(false), eq(false)))
          .thenThrow(new OperationException(HttpStatus.BAD_REQUEST, "La sesión no tiene tarifa asignada"));

      assertThatThrownBy(() -> service.execute(request("T-100", null, PaymentMethod.CASH)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("La sesión no tiene tarifa asignada");
    }

    @Test
    void throwsWhenPaymentMethodMissingForNonZeroTotal() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));

      assertThatThrownBy(() -> service.execute(request("T-100", null, null)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Registre medio de pago");
    }

    @Test
    void throwsWhenPhotoRequiredButMissing() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      OperationalParameter param = new OperationalParameter();
      param.setRequirePhotoExit(true);
      ParkingSite site = new ParkingSite();
      site.setId(UUID.randomUUID());
      when(parkingSitePort.findByCodeAndCompanyId(eq("Test Site"), eq(companyId)))
          .thenReturn(Optional.of(site));
      when(operationalParameterRepository.findBySite_Id(site.getId()))
          .thenReturn(Optional.of(param));

      assertThatThrownBy(() -> service.execute(request("T-100", null, PaymentMethod.CASH)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("exige foto en salida");
    }

    @Test
    void allowsExitWithoutPaymentWhenParamEnabled() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      OperationalParameter param = new OperationalParameter();
      param.setAllowExitWithoutPayment(true);
      ParkingSite site = new ParkingSite();
      site.setId(UUID.randomUUID());
      when(parkingSitePort.findByCodeAndCompanyId(eq("Test Site"), eq(companyId)))
          .thenReturn(Optional.of(site));
      when(operationalParameterRepository.findBySite_Id(site.getId()))
          .thenReturn(Optional.of(param));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, null));

      assertThat(result).isNotNull();
      assertThat(result.message()).contains("Salida registrada");
    }

    @Test
    void throwsWhenOperatorNotFound() {
      mockIdempotency(false);
      mockSessionLookup();
      when(appUserRepository.findById(operatorId)).thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.execute(request("T-100", null, PaymentMethod.CASH)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Operador no encontrado");
    }
  }

  // =========================================================================
  // CUSTODIED ITEMS (HELMET) RETURN
  // =========================================================================

  @Nested
  class CustodiedItemReturn {

    private CustodiedItem helmet;
    private UUID helmetId;

    @BeforeEach
    void setUpHelmet() {
      helmetId = UUID.randomUUID();
      Locker locker = Locker.builder()
          .id(UUID.randomUUID())
          .code("L01")
          .status(LockerStatus.OCUPADO)
          .companyId(companyId)
          .build();

      helmet = CustodiedItem.builder()
          .id(helmetId)
          .session(activeSession)
          .itemType(CustodiedItemType.HELMET)
          .identifier("L01")
          .status(CustodiedItemStatus.RECEIVED)
          .locker(locker)
          .companyId(companyId)
          .build();
      activeSession.setHasHelmet(true);
    }

    @Test
    void returnsHelmetAndReleasesLocker() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(1, BigDecimal.valueOf(1500), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(1500)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(List.of(helmet));
      when(custodiedItemRepository.findBySessionAndStatus(activeSession, CustodiedItemStatus.RECEIVED))
          .thenReturn(List.of(helmet));

      ExitRequest req = new ExitRequest("idem-key", "T-100", null, operatorId, PaymentMethod.CASH,
          null, null, "Salida", null, null, null, null, List.of(helmetId), "Devuelto en salida", null);
      service.execute(req);

      ArgumentCaptor<CustodiedItem> captor = ArgumentCaptor.forClass(CustodiedItem.class);
      verify(custodiedItemRepository).save(captor.capture());
      CustodiedItem saved = captor.getValue();
      assertThat(saved.getStatus()).isEqualTo(CustodiedItemStatus.RETURNED);
      assertThat(saved.getReturnedBy()).isEqualTo(operator);
      assertThat(saved.getReturnedAt()).isNotNull();

      ArgumentCaptor<Locker> lockerCaptor = ArgumentCaptor.forClass(Locker.class);
      verify(lockerPort).save(lockerCaptor.capture());
      assertThat(lockerCaptor.getValue().getStatus()).isEqualTo(LockerStatus.DISPONIBLE);
    }

    @Test
    void throwsWhenHelmetNotReturnedWithoutOverride() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(1, BigDecimal.valueOf(1500), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(1500)));
      when(custodiedItemRepository.findBySessionAndStatus(activeSession, CustodiedItemStatus.RECEIVED))
          .thenReturn(List.of(helmet));

      assertThatThrownBy(() -> service.execute(request("T-100", null, PaymentMethod.CASH)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("elementos pendientes de devolución");
    }

    @Test
    void allowsHelmetNotReturnedWithOverridePermission() {
      List<SimpleGrantedAuthority> overrideAuths = List.of(
          new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"),
          new SimpleGrantedAuthority("custodied_items:override"));
      AuthPrincipal principal = new AuthPrincipal(
          UUID.randomUUID(), companyId, "super@test.com", "SUPER_ADMIN", overrideAuths);
      org.springframework.security.core.context.SecurityContextHolder.getContext()
          .setAuthentication(new TestingAuthenticationToken(principal, null, overrideAuths));

      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(1, BigDecimal.valueOf(1500), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(1500)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(List.of(helmet));
      when(custodiedItemRepository.findBySessionAndStatus(activeSession, CustodiedItemStatus.RECEIVED))
          .thenReturn(List.of(helmet));

      OperationResultResponse result = service.execute(request("T-100", null, PaymentMethod.CASH));

      assertThat(result).isNotNull();
    }
  }

  // =========================================================================
  // PRECALCULATE
  // =========================================================================

  @Nested
  class Precalculate {

    @Test
    void precalculatesExitWithoutSaving() {
      when(parkingSessionRepository.findByStatusAndTicketNumberAndCompanyId(
          eq(SessionStatus.ACTIVE), eq("T-100"), eq(companyId)))
          .thenReturn(Optional.of(activeSession));
      when(parkingPricingUseCase.calculateComplexPrice(eq(activeSession), any(), any(), eq(false), eq(true)))
          .thenReturn(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      when(parkingPricingUseCase.applyCourtesyPricing(eq(activeSession), any(), eq(false))).thenAnswer(i -> i.getArgument(1));

      ExitRequest req = request("T-100", null, PaymentMethod.CASH);
      OperationResultResponse result = service.precalculate(req);

      assertThat(result.message()).contains("Cálculo previo exitoso");
      assertThat(result.total()).isEqualByComparingTo(BigDecimal.valueOf(4000));
      verify(parkingSessionRepository, never()).save(any());
      verify(paymentRepository, never()).save(any());
    }

    @Test
    void precalculateThrowsWhenSessionNotFound() {
      when(parkingSessionRepository.findByStatusAndTicketNumberAndCompanyId(
          eq(SessionStatus.ACTIVE), eq("GHOST"), eq(companyId)))
          .thenReturn(Optional.empty());

      ExitRequest req = request("GHOST", null, PaymentMethod.CASH);
      assertThatThrownBy(() -> service.precalculate(req))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Sesión activa no encontrada");
    }
  }

  // =========================================================================
  // IDEMPOTENCY
  // =========================================================================

  @Nested
  class Idempotency {

    @Test
    void replaysIdempotentExit() {
      activeSession.setExitAt(OffsetDateTime.now());
      activeSession.setStatus(SessionStatus.CLOSED);
      activeSession.setTotalAmount(BigDecimal.valueOf(4000));
      OperationIdempotency existing = new OperationIdempotency();
      existing.setIdempotencyKey("idem-key");
      existing.setOperationType(IdempotentOperationType.EXIT);
      existing.setSession(activeSession);
      when(operationIdempotencyRepository.findByIdempotencyKey("idem-key"))
          .thenReturn(Optional.of(existing));
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, PaymentMethod.CASH));

      assertThat(result.message()).contains("idempotente");
      assertThat(result.total()).isEqualByComparingTo(BigDecimal.valueOf(4000));
      verify(parkingSessionRepository, never()).save(any());
    }

    @Test
    void recordsNewIdempotencyOnSuccessfulExit() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      service.execute(request("T-100", null, PaymentMethod.CASH));

      verify(operationIdempotencyRepository).save(argThat(i ->
          i.getIdempotencyKey().equals("idem-key") &&
          i.getOperationType() == IdempotentOperationType.EXIT));
    }
  }

  // =========================================================================
  // VEHICLE CONDITION
  // =========================================================================

  @Nested
  class VehicleCondition {

    @Test
    void savesVehicleConditionOnExit() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      ExitRequest req = new ExitRequest("idem-key", "T-100", null, operatorId, PaymentMethod.CASH,
          null, null, "Salida", null, "Sin novedades", List.of("carroceria_ok", "luces_ok"),
          List.of("https://example.test/exit-photo.jpg"), null, null, null);
      service.execute(req);

      ArgumentCaptor<VehicleConditionReport> captor = ArgumentCaptor.forClass(VehicleConditionReport.class);
      verify(vehicleConditionReportRepository).save(captor.capture());
      VehicleConditionReport report = captor.getValue();
      assertThat(report.getStage()).isEqualTo(ConditionStage.EXIT);
      assertThat(report.getObservations()).isEqualTo("Sin novedades");
      assertThat(report.getCreatedBy()).isEqualTo(operator);
    }

    @Test
    void detectsConditionMismatchWhenEntryReportExists() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());
      when(vehicleConditionReportRepository.findEntryAndExitReports(activeSession))
          .thenReturn(List.of(new VehicleConditionReport(), new VehicleConditionReport()));

      service.execute(request("T-100", null, PaymentMethod.CASH));

      verify(vehicleConditionReportRepository).findEntryAndExitReports(activeSession);
      verify(operationAuditService).recordEvent(activeSession, SessionEventType.EXIT_RECORDED, operator, "Salida registrada");
    }

    @Test
    void skipsConditionSaveWhenNoDataProvided() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      service.execute(request("T-100", null, PaymentMethod.CASH));

      verify(vehicleConditionReportRepository, never()).save(any());
    }
  }

  // =========================================================================
  // PAYMENT METHODS
  // =========================================================================

  @Nested
  class PaymentMethods {

    @Test
    void executesWithCardPayment() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, PaymentMethod.CREDIT_CARD));
      assertThat(result.receipt().status()).isEqualTo(SessionStatus.CLOSED);
    }

    @Test
    void executesWithQRPayment() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, PaymentMethod.QR));
      assertThat(result.receipt().status()).isEqualTo(SessionStatus.CLOSED);
    }

    @Test
    void executesWithTransferPayment() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, PaymentMethod.TRANSFER));
      assertThat(result.receipt().status()).isEqualTo(SessionStatus.CLOSED);
    }

    @Test
    void executesWithAgreementPayment() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, PaymentMethod.AGREEMENT));
      assertThat(result.receipt().status()).isEqualTo(SessionStatus.CLOSED);
    }

    @Test
    void executesWithMixedPayment() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OperationResultResponse result = service.execute(request("T-100", null, PaymentMethod.MIXED));
      assertThat(result.receipt().status()).isEqualTo(SessionStatus.CLOSED);
    }
  }

  // =========================================================================
  // PRINTING
  // =========================================================================

  @Nested
  class Printing {

    @Test
    void enqueuesPrintJobOnExit() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      service.execute(request("T-100", null, PaymentMethod.CASH));

      verify(operationPrintService).enqueuePrintJob(activeSession, operator,
          com.parkflow.modules.tickets.domain.PrintDocumentType.EXIT, "exit");
    }

    @Test
    void skipsPrintWhenParamDisabled() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(false);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      service.execute(request("T-100", null, PaymentMethod.CASH));

      verify(operationPrintService, never()).enqueuePrintJob(any(), any(), any(), any());
    }

    @Test
    void printFailureDoesNotBlockExit() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());
      doThrow(new RuntimeException("Printer offline"))
          .when(operationPrintService).enqueuePrintJob(any(), any(), any(), any());

      OperationResultResponse result = service.execute(request("T-100", null, PaymentMethod.CASH));

      assertThat(result).isNotNull();
      assertThat(result.message()).contains("Salida registrada");
    }
  }

  // =========================================================================
  // SPACE RELEASE & SYNC STATUS
  // =========================================================================

  @Nested
  class PostExitEffects {

    @Test
    void releasesParkingSpaceOnExit() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      service.execute(request("T-100", null, PaymentMethod.CASH));

      verify(parkingSpaceService).releaseSpaceBySession(sessionId);
    }

    @Test
    void setsSyncStatusToPendingOnExit() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      service.execute(request("T-100", null, PaymentMethod.CASH));

      assertThat(activeSession.getSyncStatus()).isEqualTo(SessionSyncStatus.PENDING);
    }
  }

  // =========================================================================
  // AUDIT & EVENTS
  // =========================================================================

  @Nested
  class AuditAndEvents {

    @Test
    void recordsExitEventOnSuccessfulExit() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      service.execute(request("T-100", null, PaymentMethod.CASH));

      verify(operationAuditService).recordEvent(activeSession,
          SessionEventType.EXIT_RECORDED, operator, "Salida registrada");
      verify(globalAuditService).record(
          eq(com.parkflow.modules.audit.domain.AuditAction.COBRAR),
          eq(operator), any(), any(), any());
    }
  }

  // =========================================================================
  // PHOTO REQUIREMENT
  // =========================================================================

  @Nested
  class PhotoRequirement {

    @Test
    void allowsExitWhenPhotoProvidedAndRequired() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      OperationalParameter param = new OperationalParameter();
      param.setRequirePhotoExit(true);
      ParkingSite site = new ParkingSite();
      site.setId(UUID.randomUUID());
      when(parkingSitePort.findByCodeAndCompanyId(eq("Test Site"), eq(companyId)))
          .thenReturn(Optional.of(site));
      when(operationalParameterRepository.findBySite_Id(site.getId()))
          .thenReturn(Optional.of(param));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      ExitRequest req = new ExitRequest("idem-key", "T-100", null, operatorId, PaymentMethod.CASH,
          null, null, "Salida", "https://example.test/exit.jpg", null, null, null, null, null, null);
      OperationResultResponse result = service.execute(req);

      assertThat(result).isNotNull();
    }
  }

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  @Nested
  class EdgeCases {

    @Test
    void exitWithCustomExitAtTime() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      OffsetDateTime customTime = OffsetDateTime.now().minusMinutes(30);
      ExitRequest req = new ExitRequest("idem-key", "T-100", null, operatorId, PaymentMethod.CASH,
          null, customTime, "Salida", null, null, null, null, null, null, null);
      service.execute(req);

      assertThat(activeSession.getExitAt()).isEqualTo(customTime);
    }

    @Test
    void throwsWhenOperatorNotFound() {
      mockIdempotency(false);
      mockSessionLookup();
      when(appUserRepository.findById(operatorId)).thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.execute(request("T-100", null, PaymentMethod.CASH)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Operador no encontrado");
    }

    @Test
    void cashMovementFailureThrowsException() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.valueOf(4000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(4000)));
      doThrow(new OperationException(HttpStatus.BAD_REQUEST, "Caja no abierta"))
          .when(parkingCashIntegrationUseCase).assertCashOpenForParkingPayment(any(), any());

      assertThatThrownBy(() -> service.execute(request("T-100", null, PaymentMethod.CASH)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Caja no abierta");
    }

    @Test
    void doesNotRecordPaymentWhenTotalIsZero() {
      mockIdempotency(false);
      mockSessionLookup();
      mockOperator();
      mockPricing(new PriceBreakdown(2, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO));
      mockParkingParams(true);
      when(custodiedItemRepository.findBySession(activeSession)).thenReturn(Collections.emptyList());

      service.execute(request("T-100", null, null));

      verify(paymentRepository, never()).save(any());
      verify(parkingCashIntegrationUseCase, never()).recordParkingPayment(any(), any(), any(), any(), any(), any());
    }
  }
}

