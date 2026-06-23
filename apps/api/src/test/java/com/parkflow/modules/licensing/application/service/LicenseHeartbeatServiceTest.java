package com.parkflow.modules.licensing.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.LicensedDevice;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import com.parkflow.modules.licensing.dto.HeartbeatRequest;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.LicenseStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.licensing.enums.RemoteCommand;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LicenseHeartbeatServiceTest {

  @Mock private CompanyPort companyRepository;
  @Mock private LicensedDevicePort deviceRepository;
  @Mock private LicenseAuditService auditService;
  @Mock private LicenseRemoteCommandPolicy remoteCommandPolicy;
  @Mock private LicenseModuleProvisioner moduleProvisioner;

  private LicenseHeartbeatService service;
  private final UUID companyId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new LicenseHeartbeatService(companyRepository, deviceRepository, auditService, remoteCommandPolicy, moduleProvisioner);
  }

  @Test
  void processHeartbeatFailsIfCompanyNotFound() {
    when(companyRepository.findById(companyId)).thenReturn(Optional.empty());
    HeartbeatRequest req = new HeartbeatRequest();
    req.setCompanyId(companyId);
    req.setDeviceFingerprint("F1");
    var res = service.processHeartbeat(req, "1.1.1.1");
    assertThat(res.getAllowOperations()).isFalse();
    assertThat(res.getMessage()).contains("no encontrada");
  }

  @Test
  void processHeartbeatFailsIfLocalPlanAndDeviceNotLicensed() {
    Company c = new Company();
    c.setId(companyId);
    c.setPlan(PlanType.LOCAL);
    when(companyRepository.findById(companyId)).thenReturn(Optional.of(c));
    when(deviceRepository.findByCompanyIdAndDeviceFingerprint(companyId, "F1")).thenReturn(Optional.empty());

    HeartbeatRequest req = new HeartbeatRequest();
    req.setCompanyId(companyId);
    req.setDeviceFingerprint("F1");
    var res = service.processHeartbeat(req, "1.1.1.1");
    assertThat(res.getAllowOperations()).isFalse();
    assertThat(res.getMessage()).contains("requiere licencia offline");
  }

  @Test
  void processHeartbeatAutoRegistersDeviceIfNotLocal() {
    Company c = new Company();
    c.setId(companyId);
    c.setPlan(PlanType.PRO);
    c.setStatus(CompanyStatus.ACTIVE);
    when(companyRepository.findById(companyId)).thenReturn(Optional.of(c));
    when(deviceRepository.findByCompanyIdAndDeviceFingerprint(companyId, "F1")).thenReturn(Optional.empty());
    when(deviceRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    HeartbeatRequest req = new HeartbeatRequest();
    req.setCompanyId(companyId);
    req.setDeviceFingerprint("F1");
    var res = service.processHeartbeat(req, "1.1.1.1");
    assertThat(res.getAllowOperations()).isTrue();
  }

  @Test
  void processHeartbeatBlocksDeviceIfCompanyCannotWrite() {
    Company c = new Company();
    c.setId(companyId);
    c.setPlan(PlanType.PRO);
    c.setStatus(CompanyStatus.EXPIRED); // Cannot write
    when(companyRepository.findById(companyId)).thenReturn(Optional.of(c));

    LicensedDevice d = new LicensedDevice();
    d.setId(UUID.randomUUID());
    d.setStatus(LicenseStatus.ACTIVE);
    d.setDeviceFingerprint("F1");
    when(deviceRepository.findByCompanyIdAndDeviceFingerprint(companyId, "F1")).thenReturn(Optional.of(d));
    when(deviceRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    HeartbeatRequest req = new HeartbeatRequest();
    req.setCompanyId(companyId);
    req.setDeviceFingerprint("F1");
    var res = service.processHeartbeat(req, "1.1.1.1");

    assertThat(res.getAllowOperations()).isFalse();
    assertThat(d.getStatus()).isEqualTo(LicenseStatus.BLOCKED);
    verify(auditService).recordAutoBlock(any(), any(), any(), any(), any());
  }

  @Test
  void processHeartbeatUpdatesSyncStatsAndAcksCommand() {
    Company c = new Company();
    c.setId(companyId);
    c.setPlan(PlanType.PRO);
    c.setStatus(CompanyStatus.ACTIVE);
    when(companyRepository.findById(companyId)).thenReturn(Optional.of(c));

    LicensedDevice d = new LicensedDevice();
    d.setId(UUID.randomUUID());
    d.setStatus(LicenseStatus.ACTIVE);
    d.queueCommand(RemoteCommand.CLEAR_LICENSE_CACHE.name(), "pl");
    when(deviceRepository.findByCompanyIdAndDeviceFingerprint(companyId, "F1")).thenReturn(Optional.of(d));
    when(deviceRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    when(remoteCommandPolicy.determine(any(), any())).thenReturn(RemoteCommand.CLEAR_LICENSE_CACHE);
    when(remoteCommandPolicy.payloadFor(any(), any())).thenReturn("payload");
    when(moduleProvisioner.enabledModuleNames(companyId)).thenReturn(List.of("M1"));

    HeartbeatRequest req = new HeartbeatRequest();
    req.setCompanyId(companyId);
    req.setDeviceFingerprint("F1");
    req.setPendingSyncCount(1L);
    req.setSyncedCount(2L);
    req.setFailedSyncCount(3L);
    req.setErrorReport("Err");
    req.setCommandAcknowledged(true);
    req.setAcknowledgedCommand(RemoteCommand.CLEAR_LICENSE_CACHE.name());
    
    var res = service.processHeartbeat(req, "1.1.1.1");

    assertThat(res.getAllowOperations()).isTrue();
    assertThat(d.getPendingSyncEvents()).isEqualTo(1);
    assertThat(d.getSyncedEvents()).isEqualTo(2);
    assertThat(d.getFailedSyncEvents()).isEqualTo(3);
    assertThat(d.getLastErrorReport()).isEqualTo("Err");
    
    assertThat(res.getCommand()).isEqualTo(RemoteCommand.CLEAR_LICENSE_CACHE);
    assertThat(res.getCommandPayload()).isEqualTo("payload");
  }
}
