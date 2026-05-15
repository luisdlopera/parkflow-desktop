package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.domain.repository.SessionEventPort;
import com.parkflow.modules.sync.domain.repository.SyncEventPort;
import com.parkflow.modules.tickets.domain.repository.PrintJobPort;
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
  private ParkingSessionPort parkingSessionRepository;

  @Mock
  private SessionEventPort sessionEventRepository;

  @Mock
  private PrintJobPort printJobRepository;

  @Mock
  private SyncEventPort syncEventRepository;

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
    when(parkingSessionRepository.countActive(any())).thenReturn(5L);
    when(parkingSessionRepository.countEntriesInPeriod(any(), any(), any())).thenReturn(10L);
    when(parkingSessionRepository.countExitsInPeriod(any(), any(), any())).thenReturn(8L);
    when(parkingSessionRepository.countReprintsInPeriod(any(), any(), any())).thenReturn(2L);
    when(parkingSessionRepository.countLostTicketsInPeriod(any(), any(), any())).thenReturn(1L);
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
