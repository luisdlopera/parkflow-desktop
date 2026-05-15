package com.parkflow.modules.licensing.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.licensing.dto.CreateCompanyRequest;
import com.parkflow.modules.licensing.dto.GenerateLicenseRequest;
import com.parkflow.modules.licensing.dto.HeartbeatRequest;
import com.parkflow.modules.licensing.dto.HeartbeatResponse;
import com.parkflow.modules.licensing.dto.LicenseValidationRequest;
import com.parkflow.modules.licensing.dto.LicenseValidationResponse;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.CompanyModule;
import com.parkflow.modules.licensing.domain.LicenseAuditLog;
import com.parkflow.modules.licensing.domain.LicensedDevice;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.ModuleType;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.licensing.enums.RemoteCommand;
import com.parkflow.modules.licensing.enums.LicenseStatus;
import com.parkflow.modules.licensing.domain.repository.CompanyModulePort;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.LicenseAuditLogPort;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import com.parkflow.modules.licensing.infrastructure.crypto.LicenseSignatureService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class LicenseServiceTest {

  @Mock private CompanyPort companyRepository;
  @Mock private LicensedDevicePort deviceRepository;
  @Mock private CompanyModulePort moduleRepository;
  @Mock private LicenseAuditLogPort auditLogRepository;
  @Mock private LicenseAuditService auditService;

  private TestLicenseFacade service;

  @BeforeEach
  void setUp() {
    LicenseSignatureService signatureService = new LicenseSignatureService();
    ReflectionTestUtils.setField(signatureService, "privateKeyBase64", "");
    ReflectionTestUtils.setField(signatureService, "publicKeyBase64", "");
    LicenseModuleProvisioner moduleProvisioner = new LicenseModuleProvisioner(moduleRepository);
    LicenseRemoteCommandPolicy remoteCommandPolicy = new LicenseRemoteCommandPolicy();
    CompanyResponseAssembler responseAssembler = new CompanyResponseAssembler(moduleRepository, deviceRepository);
    service = new TestLicenseFacade(
        new CompanyManagementService(companyRepository, auditLogRepository, moduleProvisioner, responseAssembler),
        new LicenseIssueService(companyRepository, deviceRepository, auditLogRepository, signatureService),
        new LicenseValidationService(companyRepository, deviceRepository, signatureService, auditService, moduleProvisioner),
        new LicenseHeartbeatService(
            companyRepository, deviceRepository, auditService, remoteCommandPolicy, moduleProvisioner));
    lenient().when(auditLogRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void createCompanyBuildsTrialCompanyAndDefaultModules() {
    CreateCompanyRequest request = new CreateCompanyRequest();
    request.setName("ACME Parking");
    request.setNit("900123456");
    request.setPlan(PlanType.PRO);
    request.setTrialDays(14);
    request.setOfflineModeAllowed(true);

    when(companyRepository.existsByNit("900123456")).thenReturn(false);
    when(companyRepository.save(any(Company.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(moduleRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(moduleRepository.findByCompanyId(any())).thenReturn(List.of());

    var response = service.createCompany(request, "admin@parkflow.local");

    assertThat(response.getName()).isEqualTo("ACME Parking");
    assertThat(response.getPlan()).isEqualTo(PlanType.PRO);
    assertThat(response.getStatus()).isEqualTo(CompanyStatus.TRIAL);
    verify(companyRepository).save(any(Company.class));
    verify(moduleRepository).saveAll(any());
    verify(auditLogRepository).save(any(LicenseAuditLog.class));
  }

  @Test
  void createCompanyRejectsDuplicateNit() {
    CreateCompanyRequest request = new CreateCompanyRequest();
    request.setName("ACME Parking");
    request.setNit("900123456");

    when(companyRepository.existsByNit("900123456")).thenReturn(true);

    assertThatThrownBy(() -> service.createCompany(request, "admin@parkflow.local"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("NIT");

    verify(companyRepository, never()).save(any());
  }

  @Test
  void generateOfflineLicenseCreatesDeviceAndSignature() {
    UUID companyId = UUID.randomUUID();
    Company company = activeCompany(companyId, PlanType.PRO);
    company.setMaxDevices(2);

    when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    when(deviceRepository.countActiveByCompanyId(companyId)).thenReturn(0L);
    when(deviceRepository.findByCompanyIdAndDeviceFingerprint(companyId, "fp-123")).thenReturn(Optional.empty());
    when(deviceRepository.save(any(LicensedDevice.class))).thenAnswer(invocation -> invocation.getArgument(0));

    GenerateLicenseRequest request = new GenerateLicenseRequest();
    request.setCompanyId(companyId);
    request.setDeviceFingerprint("fp-123");
    request.setHostname("KIOSK-1");
    request.setOperatingSystem("macOS");

    var response = service.generateOfflineLicense(request, "admin@parkflow.local");

    assertThat(response.getLicenseKey()).isNotBlank();
    assertThat(response.getSignature()).isNotBlank();
    assertThat(response.getExpiresAt()).isEqualTo(company.getExpiresAt());
    verify(deviceRepository).save(any(LicensedDevice.class));
    verify(auditLogRepository).save(any(LicenseAuditLog.class));
  }

  @Test
  void validateLicenseBlocksDeviceOnInvalidSignature() {
    UUID companyId = UUID.randomUUID();
    Company company = activeCompany(companyId, PlanType.PRO);
    LicensedDevice device = registeredDevice(company, "fp-123");
    device.setStatus(LicenseStatus.ACTIVE);
    device.setExpiresAt(company.getExpiresAt());
    device.setSignature("bad-signature");
    device.setLicenseKey("license-key");

    when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    when(deviceRepository.findByCompanyIdAndDeviceFingerprint(companyId, "fp-123")).thenReturn(Optional.of(device));
    when(deviceRepository.save(any(LicensedDevice.class))).thenAnswer(invocation -> invocation.getArgument(0));

    LicenseValidationRequest request = new LicenseValidationRequest();
    request.setCompanyId(companyId);
    request.setDeviceFingerprint("fp-123");
    request.setLicenseKey("license-key");
    request.setSignature("invalid");

    LicenseValidationResponse response = service.validateLicense(request);

    assertThat(response.isValid()).isFalse();
    assertThat(response.getErrorCode()).isEqualTo("INVALID_SIGNATURE");
    verify(auditService).recordAutoBlock(eq(companyId), eq("fp-123"), eq("INVALID_SIGNATURE"), anyString(), any());
    verify(deviceRepository).save(any(LicensedDevice.class));
  }

  @Test
  void validateLicenseAcceptsValidDevelopmentSignature() {
    UUID companyId = UUID.randomUUID();
    Company company = activeCompany(companyId, PlanType.PRO);
    company.setStatus(CompanyStatus.ACTIVE);

    LicensedDevice device = registeredDevice(company, "fp-123");
    device.setStatus(LicenseStatus.ACTIVE);
    device.setExpiresAt(company.getExpiresAt());
    device.setLicenseKey("license-key");

    String signature = devSignature(companyId.toString(), "fp-123", "license-key", company.getExpiresAt().toString());

    lenient().when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    lenient().when(deviceRepository.findByCompanyIdAndDeviceFingerprint(companyId, "fp-123"))
        .thenReturn(Optional.of(device));
    lenient().when(moduleRepository.findByCompanyIdAndEnabled(companyId, true))
        .thenReturn(List.of(activeModule(company, ModuleType.CLOUD_SYNC)));
    lenient().when(deviceRepository.save(any(LicensedDevice.class))).thenAnswer(invocation -> invocation.getArgument(0));

    LicenseValidationRequest request = new LicenseValidationRequest();
    request.setCompanyId(companyId);
    request.setDeviceFingerprint("fp-123");
    request.setLicenseKey("license-key");
    request.setSignature(signature);

    LicenseValidationResponse response = service.validateLicense(request);

    assertThat(response.isValid()).isTrue();
    assertThat(response.getAllowOperations()).isTrue();
    assertThat(response.getEnabledModules()).contains("CLOUD_SYNC");
  }

  @Test
  void processHeartbeatQueuesPaymentReminderForExpiringCompany() {
    UUID companyId = UUID.randomUUID();
    Company company = activeCompany(companyId, PlanType.PRO);
    company.setExpiresAt(OffsetDateTime.now().plusDays(3));
    company.setGraceUntil(company.getExpiresAt().plusDays(7));

    LicensedDevice device = registeredDevice(company, "fp-123");
    device.setStatus(LicenseStatus.ACTIVE);
    device.setExpiresAt(company.getExpiresAt());

    when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    when(deviceRepository.findByCompanyIdAndDeviceFingerprint(companyId, "fp-123")).thenReturn(Optional.of(device));
    when(deviceRepository.save(any(LicensedDevice.class))).thenAnswer(invocation -> invocation.getArgument(0));

    HeartbeatRequest request = new HeartbeatRequest();
    request.setCompanyId(companyId);
    request.setDeviceFingerprint("fp-123");
    request.setAppVersion("1.0.0");

    HeartbeatResponse response = service.processHeartbeat(request, "127.0.0.1");

    assertThat(response.getAllowOperations()).isTrue();
    assertThat(response.getCommand()).isEqualTo(RemoteCommand.PAYMENT_REMINDER);
    assertThat(response.getCommandPayload()).contains("vence");
    verify(deviceRepository, org.mockito.Mockito.times(2)).save(any(LicensedDevice.class));
  }

  private Company activeCompany(UUID id, PlanType plan) {
    Company company = new Company();
    company.setId(id);
    company.setName("ParkFlow SA");
    company.setPlan(plan);
    company.setStatus(CompanyStatus.ACTIVE);
    company.setMaxDevices(2);
    company.setMaxLocations(1);
    company.setMaxUsers(5);
    company.setOfflineModeAllowed(true);
    company.setOperationMode(Company.OperationMode.OFFLINE);
    company.setAllowSync(true);
    company.setCreatedAt(OffsetDateTime.now().minusDays(1));
    company.setExpiresAt(OffsetDateTime.now().plusDays(30));
    company.setGraceUntil(company.getExpiresAt().plusDays(7));
    return company;
  }

  private LicensedDevice registeredDevice(Company company, String fingerprint) {
    LicensedDevice device = new LicensedDevice();
    device.setId(UUID.randomUUID());
    device.setCompany(company);
    device.setDeviceFingerprint(fingerprint);
    device.setHostname("KIOSK-1");
    device.setOperatingSystem("macOS");
    device.setAppVersion("1.0.0");
    device.setExpiresAt(company.getExpiresAt());
    return device;
  }

  private CompanyModule activeModule(Company company, ModuleType moduleType) {
    CompanyModule module = new CompanyModule();
    module.setId(UUID.randomUUID());
    module.setCompany(company);
    module.setModuleType(moduleType);
    module.setEnabled(true);
    module.setExpiresAt(company.getExpiresAt());
    return module;
  }

  private String devSignature(String companyId, String deviceFingerprint, String licenseKey, String expiresAt) {
    try {
      String data = companyId + ":" + deviceFingerprint + ":" + licenseKey + ":" + expiresAt;
      return java.util.Base64.getEncoder().encodeToString(
          java.security.MessageDigest.getInstance("SHA-256").digest(data.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  private record TestLicenseFacade(
      CompanyManagementService companyManagementService,
      LicenseIssueService licenseIssueService,
      LicenseValidationService licenseValidationService,
      LicenseHeartbeatService licenseHeartbeatService) {
    com.parkflow.modules.licensing.dto.CompanyResponse createCompany(CreateCompanyRequest request, String performedBy) {
      return companyManagementService.createCompany(request, performedBy);
    }

    com.parkflow.modules.licensing.dto.GenerateLicenseResponse generateOfflineLicense(
        GenerateLicenseRequest request, String performedBy) {
      return licenseIssueService.generateOfflineLicense(request, performedBy);
    }

    LicenseValidationResponse validateLicense(LicenseValidationRequest request) {
      return licenseValidationService.validateLicense(request);
    }

    HeartbeatResponse processHeartbeat(HeartbeatRequest request, String clientIp) {
      return licenseHeartbeatService.processHeartbeat(request, clientIp);
    }
  }
}
