package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.parking.operation.application.port.in.RegisterExitUseCase;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.dto.MassExitFilterRequest;
import com.parkflow.modules.parking.operation.dto.MassExitItemResult;
import com.parkflow.modules.parking.operation.dto.MassExitItemResult.MassExitItemStatus;
import com.parkflow.modules.parking.operation.dto.MassExitPreviewResponse;
import com.parkflow.modules.parking.operation.dto.MassExitResponse;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.infrastructure.persistence.ParkingSessionRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class MassExitServiceTest {

  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private AppUserPort appUserRepository;
  @Mock private RegisterExitUseCase registerExitUseCase;
  @Mock private MassExitItemProcessor itemProcessor;
  @Mock private AuditPort globalAuditService;

  private MassExitService service;
  private final UUID companyId = UUID.randomUUID();
  private final UUID operatorId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    AuthPrincipal principal = new AuthPrincipal(
        UUID.randomUUID(), companyId, "test@test.com", "ADMIN", List.of());
    SecurityContextHolder.getContext().setAuthentication(
        new TestingAuthenticationToken(principal, null, List.of()));

    service = new MassExitService(
        parkingSessionRepository, appUserRepository, registerExitUseCase,
        itemProcessor, globalAuditService);
  }

  private ParkingSession createSession(String ticket, String plate) {
    Vehicle v = new Vehicle();
    v.setType("CAR");
    return ParkingSession.builder()
        .ticketNumber(ticket)
        .plate(plate)
        .vehicle(v)
        .entryAt(OffsetDateTime.now().minusHours(1))
        .build();
  }

  @Nested
  class Preview {
    @Test
    void previewsSuccessfully() {
      ParkingSession s1 = createSession("T-1", "ABC");
      when(parkingSessionRepository.findAllActiveByFilters(any(), any(), any(), any()))
          .thenReturn(List.of(s1));
      when(registerExitUseCase.precalculate(any(), anyBoolean()))
          .thenReturn(new OperationResultResponse(null, null, "ok", BigDecimal.valueOf(1000), BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.valueOf(1000)));

      MassExitFilterRequest req = new MassExitFilterRequest(
          MassExitFilterRequest.ChargeMode.FREE, null, "Reason", null, null,
          null, null, null, operatorId, null, null
      );

      MassExitPreviewResponse result = service.preview(req);

      assertThat(result.totalCandidates()).isEqualTo(1);
      assertThat(result.items()).hasSize(1);
      assertThat(result.items().get(0).status()).isEqualTo(MassExitItemStatus.SUCCESS);
      assertThat(result.items().get(0).amountCharged()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void previewsWithErrors() {
      ParkingSession s1 = createSession("T-1", "ABC");
      when(parkingSessionRepository.findAllActiveByFilters(any(), any(), any(), any()))
          .thenReturn(List.of(s1));
      when(registerExitUseCase.precalculate(any(), anyBoolean()))
          .thenThrow(new RuntimeException("calc error"));

      MassExitFilterRequest req = new MassExitFilterRequest(
          MassExitFilterRequest.ChargeMode.NORMAL, null, "Reason", null, null,
          null, null, null, operatorId, null, null
      );

      MassExitPreviewResponse result = service.preview(req);

      assertThat(result.totalCandidates()).isEqualTo(1);
      assertThat(result.items()).hasSize(1);
      assertThat(result.items().get(0).status()).isEqualTo(MassExitItemStatus.SKIPPED);
      assertThat(result.warnings()).hasSize(1);
      assertThat(result.warnings().get(0)).contains("calc error");
    }
  }

  @Nested
  class Process {
    @Test
    void processesSuccessfully() {
      ParkingSession s1 = createSession("T-1", "ABC");
      AppUser op = new AppUser();
      op.setId(operatorId);

      when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(op));
      when(parkingSessionRepository.findAllActiveByFilters(any(), any(), any(), any()))
          .thenReturn(List.of(s1));

      MassExitItemResult itemResult = new MassExitItemResult("T-1", "ABC", "CAR", "SITE1", OffsetDateTime.now(), MassExitItemStatus.SUCCESS, BigDecimal.valueOf(2000), null);
      when(itemProcessor.processOne(eq(s1), any(), eq(op), anyString()))
          .thenReturn(itemResult);

      MassExitFilterRequest req = new MassExitFilterRequest(
          MassExitFilterRequest.ChargeMode.NORMAL, null, "test reason", null, null,
          null, null, null, operatorId, null, null
      );

      MassExitResponse result = service.process(req);

      assertThat(result.totalCandidates()).isEqualTo(1);
      assertThat(result.successCount()).isEqualTo(1);
      assertThat(result.totalCharged()).isEqualByComparingTo(BigDecimal.valueOf(2000));
      verify(globalAuditService).record(any(), any(), any(), any(), anyString());
    }

    @Test
    void filtersBySelectedLocators() {
      ParkingSession s1 = createSession("T-1", "ABC");
      ParkingSession s2 = createSession("T-2", "DEF");
      AppUser op = new AppUser();
      op.setId(operatorId);

      when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(op));
      when(parkingSessionRepository.findAllActiveByFilters(any(), any(), any(), any()))
          .thenReturn(List.of(s1, s2));

      MassExitItemResult itemResult = new MassExitItemResult("T-1", "ABC", "CAR", "SITE1", OffsetDateTime.now(), MassExitItemStatus.SUCCESS, BigDecimal.valueOf(2000), null);
      when(itemProcessor.processOne(eq(s1), any(), eq(op), anyString()))
          .thenReturn(itemResult);

      MassExitFilterRequest req = new MassExitFilterRequest(
          MassExitFilterRequest.ChargeMode.NORMAL, null, "test reason", null, null,
          null, null, List.of("T-1"), operatorId, null, null
      );

      MassExitResponse result = service.process(req);

      assertThat(result.totalCandidates()).isEqualTo(1);
      assertThat(result.successCount()).isEqualTo(1);
      verify(itemProcessor, times(1)).processOne(any(), any(), any(), anyString());
    }
  }
}
