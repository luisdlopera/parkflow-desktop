package com.parkflow.modules.parking.operation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.parking.operation.domain.UserRole;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.SessionEventRepository;
import com.parkflow.modules.sync.repository.SyncEventRepository;
import com.parkflow.modules.tickets.repository.PrintJobRepository;
import java.time.ZoneId;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class SupervisorServiceTest {

  @Mock
  private ParkingSessionRepository parkingSessionRepository;

  @Mock
  private SessionEventRepository sessionEventRepository;

  @Mock
  private PrintJobRepository printJobRepository;

  @Mock
  private SyncEventRepository syncEventRepository;

  @InjectMocks
  private SupervisorService supervisorService;

  @BeforeEach
  void setUp() {
    UUID companyId = UUID.randomUUID();
    AuthPrincipal principal = new AuthPrincipal(
        UUID.randomUUID(),
        companyId,
        "supervisor@test.com",
        UserRole.ADMIN.name(),
        java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void buildSummary_ShouldReturnCorrectCounts() {
    when(parkingSessionRepository.countActive()).thenReturn(5L);
    when(parkingSessionRepository.countEntriesInPeriod(any(), any())).thenReturn(10L);
    when(parkingSessionRepository.countExitsInPeriod(any(), any())).thenReturn(8L);
    when(parkingSessionRepository.countReprintsInPeriod(any(), any())).thenReturn(2L);
    when(parkingSessionRepository.countLostTicketsInPeriod(any(), any())).thenReturn(1L);
    when(printJobRepository.countByCompanyIdAndStatusInAndCreatedAtBetween(any(), any(), any(), any())).thenReturn(0L);
    when(printJobRepository.countByCompanyIdAndStatusInAndCreatedAtAfter(any(), any(), any())).thenReturn(1L);
    when(syncEventRepository.countByCompanyIdAndSyncedAtIsNull(any())).thenReturn(3L);

    var summary = supervisorService.buildSummary(ZoneId.of("America/Bogota"));

    assertThat(summary.activeVehicles()).isEqualTo(5);
    assertThat(summary.entriesSinceMidnight()).isEqualTo(10);
    assertThat(summary.exitsSinceMidnight()).isEqualTo(8);
    assertThat(summary.reprintsSinceMidnight()).isEqualTo(2);
    assertThat(summary.lostTicketSinceMidnight()).isEqualTo(1);
    assertThat(summary.printFailedSinceMidnight()).isEqualTo(0);
    assertThat(summary.printDeadLetterSinceMidnight()).isEqualTo(1);
    assertThat(summary.syncQueuePending()).isEqualTo(3);
  }
}