package com.parkflow.modules.parking.operation.application.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.domain.repository.CashSessionPort;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import com.parkflow.modules.parking.operation.dto.OperationalHealthResponse;
import com.parkflow.modules.sync.domain.SyncEvent;
import com.parkflow.modules.sync.domain.repository.SyncEventPort;
import com.parkflow.modules.tickets.domain.PrintJob;
import com.parkflow.modules.tickets.domain.PrintJobStatus;
import com.parkflow.modules.tickets.domain.repository.PrintJobPort;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("OperationalHealthService Unit Tests")
class OperationalHealthServiceTest {

  @Mock private PrintJobPort printJobRepository;
  @Mock private SyncEventPort syncEventRepository;
  @Mock private LicensedDevicePort licensedDeviceRepository;
  @Mock private CashSessionPort cashSessionRepository;

  @InjectMocks private OperationalHealthService operationalHealthService;

  @Test
  void getOperationalHealth_ShouldReturnCritical_WhenDeadLettersExist() {
    UUID companyId = UUID.randomUUID();
    try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
      securityUtils.when(SecurityUtils::requireCompanyId).thenReturn(companyId);

      PrintJob deadJob = new PrintJob();
      deadJob.setStatus(PrintJobStatus.DEAD_LETTER);
      deadJob.setLastError("Failed permanently");
      deadJob.setUpdatedAt(OffsetDateTime.now());

      when(syncEventRepository.countByCompanyIdAndSyncedAtIsNull(companyId)).thenReturn(0L);
      when(printJobRepository.findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(companyId, EnumSet.of(PrintJobStatus.FAILED))).thenReturn(List.of());
      when(printJobRepository.findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(companyId, EnumSet.of(PrintJobStatus.DEAD_LETTER))).thenReturn(List.of(deadJob));
      when(licensedDeviceRepository.findLastHeartbeatAtByCompanyId(companyId)).thenReturn(Optional.of(OffsetDateTime.now()));
      when(syncEventRepository.findTopByCompanyIdAndSyncedAtIsNotNullOrderBySyncedAtDesc(companyId)).thenReturn(Optional.empty());
      when(cashSessionRepository.countByStatus(CashSessionStatus.OPEN)).thenReturn(5L);
      when(printJobRepository.findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(companyId, EnumSet.of(PrintJobStatus.FAILED, PrintJobStatus.DEAD_LETTER))).thenReturn(List.of(deadJob));

      OperationalHealthResponse response = operationalHealthService.getOperationalHealth();

      assertEquals("CRITICAL", response.overallStatus());
      assertEquals("CRITICAL", response.printerStatus());
      assertEquals(5L, response.openCashRegisters());
      assertFalse(response.recentErrors().isEmpty());
    }
  }

  @Test
  void getOperationalHealth_ShouldReturnWarning_WhenHeartbeatIsOld() {
    UUID companyId = UUID.randomUUID();
    try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
      securityUtils.when(SecurityUtils::requireCompanyId).thenReturn(companyId);

      when(syncEventRepository.countByCompanyIdAndSyncedAtIsNull(companyId)).thenReturn(0L);
      when(printJobRepository.findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(companyId, EnumSet.of(PrintJobStatus.FAILED))).thenReturn(List.of());
      when(printJobRepository.findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(companyId, EnumSet.of(PrintJobStatus.DEAD_LETTER))).thenReturn(List.of());
      
      // Heartbeat older than 10 minutes
      when(licensedDeviceRepository.findLastHeartbeatAtByCompanyId(companyId))
          .thenReturn(Optional.of(OffsetDateTime.now().minusMinutes(15)));
          
      SyncEvent syncEvent = new SyncEvent();
      syncEvent.setSyncedAt(OffsetDateTime.now());
      when(syncEventRepository.findTopByCompanyIdAndSyncedAtIsNotNullOrderBySyncedAtDesc(companyId)).thenReturn(Optional.of(syncEvent));
      when(cashSessionRepository.countByStatus(CashSessionStatus.OPEN)).thenReturn(1L);
      when(printJobRepository.findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(companyId, EnumSet.of(PrintJobStatus.FAILED, PrintJobStatus.DEAD_LETTER))).thenReturn(List.of());

      OperationalHealthResponse response = operationalHealthService.getOperationalHealth();

      assertEquals("WARNING", response.overallStatus());
      assertEquals("OK", response.printerStatus());
      assertNotNull(response.lastSuccessfulSync());
      assertEquals(1L, response.openCashRegisters());
    }
  }

  @Test
  void getOperationalHealth_ShouldReturnOk_WhenAllSystemsNormal() {
    UUID companyId = UUID.randomUUID();
    try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
      securityUtils.when(SecurityUtils::requireCompanyId).thenReturn(companyId);

      when(syncEventRepository.countByCompanyIdAndSyncedAtIsNull(companyId)).thenReturn(0L);
      when(printJobRepository.findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(companyId, EnumSet.of(PrintJobStatus.FAILED))).thenReturn(List.of());
      when(printJobRepository.findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(companyId, EnumSet.of(PrintJobStatus.DEAD_LETTER))).thenReturn(List.of());
      when(licensedDeviceRepository.findLastHeartbeatAtByCompanyId(companyId)).thenReturn(Optional.of(OffsetDateTime.now()));
      when(syncEventRepository.findTopByCompanyIdAndSyncedAtIsNotNullOrderBySyncedAtDesc(companyId)).thenReturn(Optional.empty());
      when(cashSessionRepository.countByStatus(CashSessionStatus.OPEN)).thenReturn(0L);
      when(printJobRepository.findTop10ByCompanyIdAndStatusInOrderByUpdatedAtDesc(companyId, EnumSet.of(PrintJobStatus.FAILED, PrintJobStatus.DEAD_LETTER))).thenReturn(List.of());

      OperationalHealthResponse response = operationalHealthService.getOperationalHealth();

      assertEquals("OK", response.overallStatus());
      assertEquals("OK", response.printerStatus());
      assertEquals(0L, response.openCashRegisters());
    }
  }
}
