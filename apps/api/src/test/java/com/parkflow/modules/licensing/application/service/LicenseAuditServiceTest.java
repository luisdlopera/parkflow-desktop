package com.parkflow.modules.licensing.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.LicenseBlockEvent;
import com.parkflow.modules.licensing.domain.LicensedDevice;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.LicenseAuditLogPort;
import com.parkflow.modules.licensing.domain.repository.LicenseBlockEventPort;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.LicenseStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LicenseAuditServiceTest {

  @Mock private LicenseAuditLogPort auditLogRepository;
  @Mock private LicenseBlockEventPort blockEventRepository;
  @Mock private CompanyPort companyPort;
  @Mock private LicensedDevicePort deviceRepository;

  private LicenseAuditService service;

  @BeforeEach
  void setUp() {
    service = new LicenseAuditService(blockEventRepository, companyPort, deviceRepository, auditLogRepository);
  }

  @Test
  void recordFailedValidationSuccess() {
    Company c = new Company();
    c.setId(UUID.randomUUID());
    when(companyPort.findById(c.getId())).thenReturn(Optional.of(c));

    service.recordFailedValidation(c.getId(), "D1", "INVALID_SIGNATURE", "D", Map.of());
    verify(blockEventRepository).save(any(LicenseBlockEvent.class));
  }

  @Test
  void recordAutoBlockSuccess() {
    Company c = new Company();
    c.setId(UUID.randomUUID());
    when(companyPort.findById(c.getId())).thenReturn(Optional.of(c));
    when(blockEventRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    var ev = service.recordAutoBlock(c.getId(), "D1", "OFFLINE_LIMIT", "Desc", Map.of());
    assertThat(ev.getReasonCode()).isEqualTo("OFFLINE_LIMIT");
    verify(blockEventRepository).save(any());
  }

  @Test
  void diagnoseCompanySuccess() {
    UUID cid = UUID.randomUUID();
    Company c = new Company();
    c.setId(cid);
    c.setName("C1");
    c.setStatus(CompanyStatus.BLOCKED);
    when(companyPort.findById(cid)).thenReturn(Optional.of(c));

    LicenseBlockEvent block = new LicenseBlockEvent();
    block.setId(UUID.randomUUID());
    block.setCompany(c);
    block.setCreatedAt(OffsetDateTime.now());
    block.setPaymentReceivedAfterBlock(true);

    when(blockEventRepository.findByCompanyIdOrderByCreatedAtDesc(cid)).thenReturn(List.of(block));
    when(blockEventRepository.countUnresolvedByCompanyId(cid)).thenReturn(1L);

    LicensedDevice d = new LicensedDevice();
    d.setStatus(LicenseStatus.ACTIVE);
    when(deviceRepository.findByCompanyId(cid)).thenReturn(List.of(d));

    var diag = service.diagnoseCompany(cid);
    assertThat(diag.getCompanyName()).isEqualTo("C1");
    assertThat(diag.getHealthStatus()).isEqualTo("CRITICAL");
  }

  @Test
  void diagnoseDeviceSuccess() {
    Company c = new Company();
    c.setId(UUID.randomUUID());
    LicensedDevice d = new LicensedDevice();
    d.setId(UUID.randomUUID());
    d.setCompany(c);
    d.setLastHeartbeatAt(OffsetDateTime.now().minusMinutes(10));
    when(deviceRepository.findByDeviceFingerprint("F1")).thenReturn(Optional.of(d));
    when(blockEventRepository.findByDeviceIdOrderByCreatedAtDesc(d.getId())).thenReturn(List.of());

    var diag = service.diagnoseDevice("F1");
    assertThat(diag.getIsOnline()).isTrue();
  }

  @Test
  void resolveBlockEventSuccess() {
    UUID id = UUID.randomUUID();
    LicenseBlockEvent ev = new LicenseBlockEvent();
    ev.setId(id);
    ev.setCompany(new Company());
    when(blockEventRepository.findById(id)).thenReturn(Optional.of(ev));

    service.resolveBlockEvent(id, "Admin", "N", "A");
    assertThat(ev.getResolved()).isTrue();
    verify(blockEventRepository).save(any());
  }

  @Test
  void markAsFalsePositiveSuccess() {
    UUID id = UUID.randomUUID();
    LicenseBlockEvent ev = new LicenseBlockEvent();
    ev.setId(id);
    when(blockEventRepository.findById(id)).thenReturn(Optional.of(ev));

    service.markAsFalsePositive(id, "A", "N");
    assertThat(ev.getFalsePositive()).isTrue();
    verify(blockEventRepository).save(ev);
  }

  @Test
  void getPrioritySupportCases() {
    LicenseBlockEvent ev = new LicenseBlockEvent();
    ev.setId(UUID.randomUUID());
    Company c = new Company();
    c.setId(UUID.randomUUID());
    c.setPlan(PlanType.ENTERPRISE);
    ev.setCompany(c);
    ev.setCreatedAt(OffsetDateTime.now().minusDays(2));

    when(blockEventRepository.findBlocksWithSubsequentPayment()).thenReturn(List.of(ev));

    var cases = service.getPrioritySupportCases();
    assertThat(cases).hasSize(1);
    assertThat(cases.get(0).getPriority()).isEqualTo("HIGH");
  }

  @Test
  void getBlockStatistics() {
    Object[] arr1 = new Object[] { "2026-06-22", 10L, 5L };
    when(blockEventRepository.getDailyStats(any())).thenReturn(java.util.Collections.singletonList(arr1));
    
    Object[] arr2 = new Object[] { "REASON_1", 10L };
    when(blockEventRepository.countByReasonSince(any())).thenReturn(java.util.Collections.singletonList(arr2));

    var stats = service.getBlockStatistics(OffsetDateTime.now().minusDays(1));
    assertThat(stats.getTotalBlockEvents()).isEqualTo(10);
    assertThat(stats.getResolvedEvents()).isEqualTo(5);
    assertThat(stats.getResolutionRate()).isEqualTo(50.0);
  }
}
