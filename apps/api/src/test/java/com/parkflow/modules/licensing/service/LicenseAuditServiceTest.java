package com.parkflow.modules.licensing.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.licensing.entity.Company;
import com.parkflow.modules.licensing.entity.LicenseAuditLog;
import com.parkflow.modules.licensing.entity.LicenseBlockEvent;
import com.parkflow.modules.licensing.entity.LicensedDevice;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.LicenseStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.licensing.repository.CompanyRepository;
import com.parkflow.modules.licensing.repository.LicenseAuditLogRepository;
import com.parkflow.modules.licensing.repository.LicenseBlockEventRepository;
import com.parkflow.modules.licensing.repository.LicensedDeviceRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LicenseAuditServiceTest {

  @Mock private LicenseBlockEventRepository blockEventRepository;
  @Mock private CompanyRepository companyRepository;
  @Mock private LicensedDeviceRepository deviceRepository;
  @Mock private LicenseAuditLogRepository auditLogRepository;

  private LicenseAuditService service;

  @BeforeEach
  void setUp() {
    service = new LicenseAuditService(blockEventRepository, companyRepository, deviceRepository, auditLogRepository);
  }

  @Test
  void recordAutoBlockPersistsDiagnostics() {
    UUID companyId = UUID.randomUUID();
    Company company = company(companyId, CompanyStatus.BLOCKED, PlanType.PRO);
    LicensedDevice device = device(company, "fp-1", LicenseStatus.ACTIVE);

    when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    when(deviceRepository.findByDeviceFingerprint("fp-1")).thenReturn(Optional.of(device));
    when(blockEventRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    LicenseBlockEvent event = service.recordAutoBlock(
        companyId,
        "fp-1",
        "INVALID_SIGNATURE",
        "Intento de validación inválido",
        Map.of("signatureValid", false, "tamperViolationCount", 2, "tamperDetails", "rollback"));

    assertThat(event.getCompany()).isEqualTo(company);
    assertThat(event.getReasonCode()).isEqualTo("INVALID_SIGNATURE");
    assertThat(event.getSignatureValid()).isFalse();
    assertThat(event.getTamperViolationCount()).isEqualTo(2);
    verify(blockEventRepository).save(any(LicenseBlockEvent.class));
  }

  @Test
  void recordFailedValidationIgnoresNonSevereErrors() {
    service.recordFailedValidation(
        UUID.randomUUID(),
        "fp-1",
        "DEVICE_NOT_REGISTERED",
        "Dispositivo no registrado",
        Map.of("companyStatus", "ACTIVE"));

    verify(blockEventRepository, never()).save(any());
    verify(companyRepository, never()).findById(any());
  }

  @Test
  void diagnoseCompanyAggregatesHealthSignals() {
    UUID companyId = UUID.randomUUID();
    Company company = company(companyId, CompanyStatus.BLOCKED, PlanType.PRO);
    LicensedDevice activeDevice = device(company, "fp-active", LicenseStatus.ACTIVE);
    LicensedDevice blockedDevice = device(company, "fp-blocked", LicenseStatus.BLOCKED);

    LicenseBlockEvent blockEvent = new LicenseBlockEvent();
    blockEvent.setId(UUID.randomUUID());
    blockEvent.setCompany(company);
    blockEvent.setReasonCode("INVALID_SIGNATURE");
    blockEvent.setReasonDescription("Firma inválida");
    blockEvent.setCreatedAt(OffsetDateTime.now().minusHours(2));
    blockEvent.setResolved(false);

    when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    when(deviceRepository.findByCompanyId(companyId)).thenReturn(List.of(activeDevice, blockedDevice));
    when(blockEventRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)).thenReturn(List.of(blockEvent));
    when(blockEventRepository.countUnresolvedByCompanyId(companyId)).thenReturn(1L);

    var diagnostics = service.diagnoseCompany(companyId);

    assertThat(diagnostics.getHealthStatus()).isEqualTo("CRITICAL");
    assertThat(diagnostics.getUnresolvedBlockEvents()).isEqualTo(1);
    assertThat(diagnostics.getRegisteredDevices()).isEqualTo(2);
    assertThat(diagnostics.getBlockedDevices()).isEqualTo(1);
    assertThat(diagnostics.getLastBlockEvent()).isNotNull();
    assertThat(diagnostics.getWarnings()).isNotEmpty();
  }

  @Test
  void resolveBlockEventPersistsAuditLog() {
    UUID companyId = UUID.randomUUID();
    UUID blockEventId = UUID.randomUUID();
    Company company = company(companyId, CompanyStatus.ACTIVE, PlanType.PRO);
    LicenseBlockEvent event = new LicenseBlockEvent();
    event.setId(blockEventId);
    event.setCompany(company);
    event.setResolved(false);

    when(blockEventRepository.findById(blockEventId)).thenReturn(Optional.of(event));
    when(blockEventRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(auditLogRepository.save(any(LicenseAuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

    service.resolveBlockEvent(blockEventId, "support@parkflow.local", "Pago aplicado", "MANUAL_UNBLOCK");

    assertThat(event.getResolved()).isTrue();
    assertThat(event.getResolvedBy()).isEqualTo("support@parkflow.local");
    verify(auditLogRepository).save(any(LicenseAuditLog.class));
  }

  private Company company(UUID id, CompanyStatus status, PlanType plan) {
    Company company = new Company();
    company.setId(id);
    company.setName("ParkFlow SA");
    company.setStatus(status);
    company.setPlan(plan);
    company.setExpiresAt(OffsetDateTime.now().plusDays(30));
    company.setGraceUntil(company.getExpiresAt().plusDays(7));
    company.setMaxDevices(2);
    return company;
  }

  private LicensedDevice device(Company company, String fingerprint, LicenseStatus status) {
    LicensedDevice device = new LicensedDevice();
    device.setId(UUID.randomUUID());
    device.setCompany(company);
    device.setDeviceFingerprint(fingerprint);
    device.setStatus(status);
    device.setExpiresAt(company.getExpiresAt());
    return device;
  }
}
