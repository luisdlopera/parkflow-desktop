package com.parkflow.modules.parking.operation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.parking.operation.domain.SessionEventType;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.SessionEventRepository;
import com.parkflow.modules.sync.repository.SyncEventRepository;
import com.parkflow.modules.tickets.entity.PrintJobStatus;
import com.parkflow.modules.tickets.repository.PrintJobRepository;
import java.time.ZoneId;
import java.util.EnumSet;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

  @Test
  void buildSummary_ShouldReturnCorrectCounts() {
    when(parkingSessionRepository.countActive()).thenReturn(5L);
    when(parkingSessionRepository.countEntriesInPeriod(any(), any())).thenReturn(10L);
    when(parkingSessionRepository.countExitsInPeriod(any(), any())).thenReturn(8L);
    when(parkingSessionRepository.countReprintsInPeriod(any(), any())).thenReturn(2L);
    when(parkingSessionRepository.countLostTicketsInPeriod(any(), any())).thenReturn(1L);
    when(printJobRepository.countByStatusInAndCreatedAtBetween(any(), any(), any())).thenReturn(0L);
    when(printJobRepository.countByStatusInAndCreatedAtAfter(any(), any())).thenReturn(1L);
    when(syncEventRepository.countBySyncedAtIsNull()).thenReturn(3L);

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