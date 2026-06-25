package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.application.port.in.ComplexPricingPort;
import com.parkflow.modules.parking.operation.domain.EntryMode;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.SessionSyncStatus;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.spaces.application.service.ParkingSpaceService;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FindActiveSessionServiceTest {

  @Mock private ParkingSessionPort parkingSessionPort;
  @Mock private ComplexPricingPort complexPricingPort;
  @Mock private CustodiedItemPort custodiedItemRepository;
  @Mock private ParkingSpaceService parkingSpaceService;

  private FindActiveSessionService service;
  private static final UUID COMPANY_ID = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new FindActiveSessionService(parkingSessionPort, complexPricingPort,
        custodiedItemRepository, parkingSpaceService);
  }

  private ParkingSession active() {
    Vehicle vehicle = new Vehicle();
    vehicle.setId(UUID.randomUUID());
    vehicle.setPlate("ABC123");
    vehicle.setType("CAR");
    return ParkingSession.builder()
        .id(UUID.randomUUID())
        .ticketNumber("T-1")
        .plate("ABC123")
        .companyId(COMPANY_ID)
        .vehicle(vehicle)
        .entryAt(OffsetDateTime.now().minusHours(1))
        .status(SessionStatus.ACTIVE)
        .site("Site")
        .syncStatus(SessionSyncStatus.SYNCED)
        .entryMode(EntryMode.VISITOR)
        .hasHelmet(false)
        .build();
  }

  private void stubPricing(ParkingSession s) {
    PriceBreakdown bd = new PriceBreakdown(1, new BigDecimal("2000"), BigDecimal.ZERO,
        BigDecimal.ZERO, 0, new BigDecimal("2000"));
    when(complexPricingPort.calculate(eq(s), any(), any(), anyBoolean(), anyBoolean()))
        .thenReturn(bd);
    when(complexPricingPort.applyCourtesy(eq(s), any(), anyBoolean())).thenReturn(bd);
    when(custodiedItemRepository.findBySession(s)).thenReturn(List.of());
    when(parkingSpaceService.findAssignmentBySessionId(s.getId())).thenReturn(null);
  }

  @Test
  void execute_byTicketAndPlate() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      ParkingSession s = active();
      when(parkingSessionPort.findByStatusAndTicketNumberAndCompanyId(
          SessionStatus.ACTIVE, "T-1", COMPANY_ID)).thenReturn(Optional.of(s));
      stubPricing(s);

      OperationResultResponse resp = service.execute("T-1", "abc123", null);

      assertThat(resp.message()).isEqualTo("Sesion activa");
      assertThat(resp.total()).isEqualByComparingTo("2000");
    }
  }

  @Test
  void execute_byTicketAndPlate_throwsWhenPlateMismatch() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      ParkingSession s = active();
      when(parkingSessionPort.findByStatusAndTicketNumberAndCompanyId(
          SessionStatus.ACTIVE, "T-1", COMPANY_ID)).thenReturn(Optional.of(s));

      assertThatThrownBy(() -> service.execute("T-1", "XYZ999", null))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Placa no coincide");
    }
  }

  @Test
  void execute_byTicketOnly() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      ParkingSession s = active();
      when(parkingSessionPort.findByStatusAndTicketNumberAndCompanyId(
          SessionStatus.ACTIVE, "T-1", COMPANY_ID)).thenReturn(Optional.of(s));
      stubPricing(s);

      OperationResultResponse resp = service.execute("T-1", null, null);
      assertThat(resp.total()).isEqualByComparingTo("2000");
    }
  }

  @Test
  void execute_byPlateOnly() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      ParkingSession s = active();
      when(parkingSessionPort.findByStatusAndVehicle_PlateAndCompanyId(
          SessionStatus.ACTIVE, "ABC123", COMPANY_ID)).thenReturn(Optional.of(s));
      stubPricing(s);

      OperationResultResponse resp = service.execute(null, "abc123", null);
      assertThat(resp.total()).isEqualByComparingTo("2000");
    }
  }

  @Test
  void execute_throwsWhenNoCriteria() {
    assertThatThrownBy(() -> service.execute(null, null, null))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("obligatorio");
  }

  @Test
  void execute_throwsWhenSessionNotFound() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      when(parkingSessionPort.findByStatusAndTicketNumberAndCompanyId(
          SessionStatus.ACTIVE, "GHOST", COMPANY_ID)).thenReturn(Optional.empty());
      assertThatThrownBy(() -> service.execute("GHOST", null, null))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Sesion activa no encontrada");
    }
  }
}
