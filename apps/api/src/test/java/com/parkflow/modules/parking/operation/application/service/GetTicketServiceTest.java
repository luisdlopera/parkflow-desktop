package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.application.port.in.ComplexPricingPort;
import com.parkflow.modules.parking.operation.domain.EntryMode;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.SessionSyncStatus;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
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
class GetTicketServiceTest {

  @Mock private ParkingSessionPort parkingSessionPort;
  @Mock private ComplexPricingPort complexPricingPort;
  @Mock private CustodiedItemPort custodiedItemRepository;

  private GetTicketService service;
  private static final UUID COMPANY_ID = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new GetTicketService(parkingSessionPort, complexPricingPort, custodiedItemRepository);
  }

  private ParkingSession session(SessionStatus status, boolean withRate) {
    Vehicle vehicle = new Vehicle();
    vehicle.setId(UUID.randomUUID());
    vehicle.setPlate("ABC123");
    vehicle.setType("CAR");
    Rate rate = null;
    if (withRate) {
      rate = new Rate();
      rate.setId(UUID.randomUUID());
      rate.setName("Standard");
      rate.setRateType(RateType.HOURLY);
      rate.setGraceMinutes(5);
    }
    return ParkingSession.builder()
        .id(UUID.randomUUID())
        .ticketNumber("T-1")
        .plate("ABC123")
        .companyId(COMPANY_ID)
        .vehicle(vehicle)
        .rate(rate)
        .entryAt(OffsetDateTime.now().minusHours(1))
        .status(status)
        .syncStatus(SessionSyncStatus.SYNCED)
        .entryMode(EntryMode.VISITOR)
        .hasHelmet(false)
        .build();
  }

  @Test
  void execute_activeWithRateEstimatesPrice() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      ParkingSession s = session(SessionStatus.ACTIVE, true);
      when(parkingSessionPort.findByTicketNumberAndCompanyId("T-1", COMPANY_ID))
          .thenReturn(Optional.of(s));
      when(custodiedItemRepository.findBySession(s)).thenReturn(List.of());
      PriceBreakdown bd = new PriceBreakdown(1, new BigDecimal("2000"), BigDecimal.ZERO,
          BigDecimal.ZERO, 0, new BigDecimal("2000"));
      when(complexPricingPort.calculate(eq(s), any(), any(), anyBoolean(), anyBoolean()))
          .thenReturn(bd);
      when(complexPricingPort.applyCourtesy(eq(s), any(), anyBoolean())).thenReturn(bd);

      OperationResultResponse resp = service.execute("T-1");

      assertThat(resp.total()).isEqualByComparingTo("2000");
      assertThat(resp.message()).isEqualTo("Ticket encontrado");
    }
  }

  @Test
  void execute_closedSessionNoEstimate() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      ParkingSession s = session(SessionStatus.CLOSED, true);
      s.setExitAt(OffsetDateTime.now());
      s.setTotalAmount(new BigDecimal("5000"));
      when(parkingSessionPort.findByTicketNumberAndCompanyId("T-1", COMPANY_ID))
          .thenReturn(Optional.of(s));
      when(custodiedItemRepository.findBySession(s)).thenReturn(List.of());

      OperationResultResponse resp = service.execute("T-1");

      assertThat(resp.total()).isEqualByComparingTo("5000");
    }
  }

  @Test
  void execute_throwsWhenNotFound() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      lenient().when(parkingSessionPort.findByTicketNumberAndCompanyId(any(), any()))
          .thenReturn(Optional.empty());
      assertThatThrownBy(() -> service.execute("X"))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Ticket no encontrado");
    }
  }
}
