package com.parkflow.modules.licensing.service;

import com.parkflow.modules.licensing.dto.*;
import com.parkflow.modules.licensing.entity.Company;
import com.parkflow.modules.licensing.entity.CompanyModule;
import com.parkflow.modules.licensing.entity.LicenseAuditLog;
import com.parkflow.modules.licensing.entity.LicensedDevice;
import com.parkflow.modules.licensing.enums.*;
import com.parkflow.modules.licensing.repository.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio principal de licenciamiento.
 * Gestiona creación, validación y renovación de licencias.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LicenseService {

  private final CompanyRepository companyRepository;
  private final LicensedDeviceRepository deviceRepository;
  private final CompanyModuleRepository moduleRepository;
  private final LicenseAuditLogRepository auditLogRepository;
  private final LicenseAuditService auditService;

  @Value("${app.licensing.private-key:}")
  private String privateKeyBase64;

  @Value("${app.licensing.public-key:}")
  private String publicKeyBase64;

  // ==================== COMPANY MANAGEMENT ====================

  @Transactional
  public CompanyResponse createCompany(CreateCompanyRequest request, String performedBy) {
    if (request.getNit() != null && companyRepository.existsByNit(request.getNit())) {
      throw new IllegalArgumentException("Ya existe una empresa con ese NIT");
    }

    Company company = new Company();
    company.setName(request.getName());
    company.setNit(request.getNit());
    company.setAddress(request.getAddress());
    company.setCity(request.getCity());
    company.setPhone(request.getPhone());
    company.setEmail(request.getEmail());
    company.setContactName(request.getContactName());
    company.setPlan(request.getPlan());
    company.setMaxDevices(request.getMaxDevices());
    company.setMaxLocations(request.getMaxLocations());
    company.setMaxUsers(request.getMaxUsers());
    company.setOfflineModeAllowed(request.getOfflineModeAllowed());

    // Configurar período de prueba
    if (request.getTrialDays() != null && request.getTrialDays() > 0) {
      company.setStatus(CompanyStatus.TRIAL);
      company.setTrialStartedAt(OffsetDateTime.now());
      company.setTrialDays(request.getTrialDays());
      company.setExpiresAt(OffsetDateTime.now().plusDays(request.getTrialDays()));
    } else {
      company.setStatus(CompanyStatus.ACTIVE);
      company.setExpiresAt(OffsetDateTime.now().plusYears(1));
    }

    // Calcular período de gracia (7 días post-expiración)
    if (company.getExpiresAt() != null) {
      company.setGraceUntil(company.getExpiresAt().plusDays(7));
    }

    company = companyRepository.save(company);

    // Crear módulos por defecto según el plan
    createDefaultModules(company);

    // Registrar en auditoría
    auditLogRepository.save(LicenseAuditLog.create(
        company, "COMPANY_CREATED",
        "Empresa creada con plan " + request.getPlan(),
        performedBy));

    return mapToCompanyResponse(company);
  }

  @Transactional(readOnly = true)
  public CompanyResponse getCompany(UUID companyId) {
    Company company = companyRepository.findById(companyId)
        .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));
    return mapToCompanyResponse(company);
  }

  @Transactional(readOnly = true)
  public List<CompanyResponse> listAllCompanies() {
    return companyRepository.findAll().stream()
        .map(this::mapToCompanyResponse)
        .toList();
  }

  @Transactional
  public CompanyResponse updateCompany(UUID companyId, UpdateCompanyRequest request, String performedBy) {
    Company company = companyRepository.findById(companyId)
        .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));

    // Guardar valores antiguos para auditoría
    String oldValues = String.format("plan=%s, status=%s", company.getPlan(), company.getStatus());

    if (request.getName() != null) company.setName(request.getName());
    if (request.getNit() != null) company.setNit(request.getNit());
    if (request.getAddress() != null) company.setAddress(request.getAddress());
    if (request.getCity() != null) company.setCity(request.getCity());
    if (request.getPhone() != null) company.setPhone(request.getPhone());
    if (request.getEmail() != null) company.setEmail(request.getEmail());
    if (request.getContactName() != null) company.setContactName(request.getContactName());
    if (request.getPlan() != null) company.setPlan(request.getPlan());
    if (request.getStatus() != null) company.setStatus(request.getStatus());
    if (request.getMaxDevices() != null) company.setMaxDevices(request.getMaxDevices());
    if (request.getMaxLocations() != null) company.setMaxLocations(request.getMaxLocations());
    if (request.getMaxUsers() != null) company.setMaxUsers(request.getMaxUsers());
    if (request.getOfflineModeAllowed() != null) company.setOfflineModeAllowed(request.getOfflineModeAllowed());
    if (request.getOfflineLeaseHours() != null) company.setOfflineLeaseHours(request.getOfflineLeaseHours());
    if (request.getCustomerMessage() != null) company.setCustomerMessage(request.getCustomerMessage());
    if (request.getAdminNotes() != null) company.setAdminNotes(request.getAdminNotes());

    company = companyRepository.save(company);

    String newValues = String.format("plan=%s, status=%s", company.getPlan(), company.getStatus());

    LicenseAuditLog log = LicenseAuditLog.create(company, "COMPANY_UPDATED",
        "Empresa actualizada", performedBy);
    log.setOldValue(oldValues);
    log.setNewValue(newValues);
    auditLogRepository.save(log);

    return mapToCompanyResponse(company);
  }

  // ==================== LICENSE GENERATION ====================

  @Transactional
  public GenerateLicenseResponse generateOfflineLicense(GenerateLicenseRequest request, String performedBy) {
    Company company = companyRepository.findById(request.getCompanyId())
        .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));

    // Verificar límite de dispositivos
    long activeDevices = deviceRepository.countActiveByCompanyId(company.getId());
    if (activeDevices >= company.getMaxDevices()) {
      throw new IllegalStateException("Límite de dispositivos alcanzado para este plan");
    }

    // Buscar o crear dispositivo
    LicensedDevice device = deviceRepository
        .findByCompanyIdAndDeviceFingerprint(company.getId(), request.getDeviceFingerprint())
        .orElseGet(() -> {
          LicensedDevice newDevice = new LicensedDevice();
          newDevice.setCompany(company);
          newDevice.setDeviceFingerprint(request.getDeviceFingerprint());
          return newDevice;
        });

    device.setHostname(request.getHostname());
    device.setOperatingSystem(request.getOperatingSystem());
    device.setCpuInfo(request.getCpuInfo());
    device.setMacAddress(request.getMacAddress());
    device.setStatus(LicenseStatus.ACTIVE);

    // Generar clave de licencia única
    String licenseKey = generateLicenseKey(company.getId(), request.getDeviceFingerprint());
    device.setLicenseKey(licenseKey);

    // Establecer expiración
    OffsetDateTime expiresAt = request.getExpiresAt() != null
        ? request.getExpiresAt()
        : company.getExpiresAt();
    device.setExpiresAt(expiresAt);

    // Generar firma digital
    String signature = signLicense(company.getId(), request.getDeviceFingerprint(), licenseKey, expiresAt);
    device.setSignature(signature);

    device = deviceRepository.save(device);

    // Registrar en auditoría
    auditLogRepository.save(LicenseAuditLog.create(company, "LICENSE_GENERATED",
        "Licencia generada para dispositivo: " + request.getDeviceFingerprint(), performedBy));

    return GenerateLicenseResponse.builder()
        .deviceId(device.getId())
        .licenseKey(licenseKey)
        .signature(signature)
        .expiresAt(expiresAt)
        .publicKey(publicKeyBase64)
        .build();
  }

  // ==================== LICENSE VALIDATION ====================

  @Transactional(readOnly = true)
  public LicenseValidationResponse validateLicense(LicenseValidationRequest request) {
    Optional<Company> companyOpt = companyRepository.findById(request.getCompanyId());
    if (companyOpt.isEmpty()) {
      return LicenseValidationResponse.builder()
          .valid(false)
          .errorCode("COMPANY_NOT_FOUND")
          .message("Empresa no encontrada")
          .build();
    }

    Company company = companyOpt.get();

    Optional<LicensedDevice> deviceOpt = deviceRepository
        .findByCompanyIdAndDeviceFingerprint(company.getId(), request.getDeviceFingerprint());

    if (deviceOpt.isEmpty()) {
      // AUDIT: Dispositivo no registrado
      auditService.recordFailedValidation(
          request.getCompanyId(),
          request.getDeviceFingerprint(),
          "DEVICE_NOT_REGISTERED",
          "Dispositivo no registrado",
          Map.of("companyStatus", company.getStatus().name())
      );

      return LicenseValidationResponse.builder()
          .valid(false)
          .errorCode("DEVICE_NOT_REGISTERED")
          .message("Dispositivo no registrado")
          .build();
    }

    LicensedDevice device = deviceOpt.get();

    // Verificar firma
    boolean signatureValid = verifySignature(
        request.getCompanyId(),
        request.getDeviceFingerprint(),
        request.getLicenseKey(),
        device.getExpiresAt(),
        request.getSignature()
    );

    if (!signatureValid) {
      // AUDIT: Firma inválida - bloqueo grave
      Map<String, Object> diagnostics = Map.of(
          "signatureValid", false,
          "expectedFingerprint", device.getDeviceFingerprint(),
          "providedFingerprint", request.getDeviceFingerprint()
      );

      auditService.recordAutoBlock(
          request.getCompanyId(),
          request.getDeviceFingerprint(),
          "INVALID_SIGNATURE",
          "Intento de validación con firma inválida",
          diagnostics
      );

      device.setStatus(LicenseStatus.BLOCKED);
      deviceRepository.save(device);

      return LicenseValidationResponse.builder()
          .valid(false)
          .errorCode("INVALID_SIGNATURE")
          .message("Firma de licencia inválida - Dispositivo bloqueado por seguridad")
          .build();
    }

    // Verificar fingerprint del dispositivo
    boolean fingerprintValid = request.getDeviceFingerprint().equals(device.getDeviceFingerprint());

    // Verificar estado de la empresa
    boolean allowOperations = company.allowsWriteOperations();

    // Si empresa bloqueada o expirada, registrar evento
    if (company.getStatus() == CompanyStatus.BLOCKED) {
      Map<String, Object> diagnostics = Map.of(
          "signatureValid", signatureValid,
          "fingerprintValid", fingerprintValid,
          "companyStatus", company.getStatus().name()
      );

      auditService.recordAutoBlock(
          request.getCompanyId(),
          request.getDeviceFingerprint(),
          "COMPANY_BLOCKED",
          "Empresa bloqueada administrativamente",
          diagnostics
      );
    }

    // Construir respuesta
    List<String> enabledModules = moduleRepository.findByCompanyIdAndEnabled(company.getId(), true)
        .stream()
        .filter(CompanyModule::isActive)
        .map(m -> m.getModuleType().name())
        .toList();

    return LicenseValidationResponse.builder()
        .valid(signatureValid && allowOperations)
        .companyId(company.getId())
        .companyName(company.getName())
        .status(company.getStatus())
        .plan(company.getPlan())
        .expiresAt(company.getExpiresAt())
        .graceUntil(company.getGraceUntil())
        .enabledModules(enabledModules)
        .allowOperations(allowOperations)
        .serverTime(OffsetDateTime.now().toString())
        .build();
  }

  // ==================== HEARTBEAT ====================

  @Transactional
  public HeartbeatResponse processHeartbeat(HeartbeatRequest request, String clientIp) {
    Optional<Company> companyOpt = companyRepository.findById(request.getCompanyId());
    if (companyOpt.isEmpty()) {
      return HeartbeatResponse.builder()
          .allowOperations(false)
          .message("Empresa no encontrada")
          .build();
    }

    Company company = companyOpt.get();

    Optional<LicensedDevice> deviceOpt = deviceRepository
        .findByCompanyIdAndDeviceFingerprint(company.getId(), request.getDeviceFingerprint());

    LicensedDevice device = deviceOpt.orElseGet(() -> {
      // Auto-registrar dispositivo si es plan cloud (no offline)
      if (company.getPlan() != PlanType.LOCAL) {
        LicensedDevice newDevice = new LicensedDevice();
        newDevice.setCompany(company);
        newDevice.setDeviceFingerprint(request.getDeviceFingerprint());
        newDevice.setStatus(LicenseStatus.ACTIVE);
        return newDevice;
      }
      return null;
    });

    if (device == null) {
      return HeartbeatResponse.builder()
          .allowOperations(false)
          .message("Dispositivo no licenciado. Plan LOCAL requiere licencia offline.")
          .build();
    }

    // Actualizar información del dispositivo
    device.recordHeartbeat();
    device.setLastIpAddress(clientIp);
    device.setAppVersion(request.getAppVersion());

    if (request.getPendingSyncCount() != null) {
      device.setPendingSyncEvents(request.getPendingSyncCount());
    }
    if (request.getSyncedCount() != null) {
      device.setSyncedEvents(request.getSyncedCount());
    }
    if (request.getFailedSyncCount() != null) {
      device.setFailedSyncEvents(request.getFailedSyncCount());
    }
    if (request.getErrorReport() != null) {
      device.setLastErrorReport(request.getErrorReport());
    }

    // Manejar ack de comando
    if (Boolean.TRUE.equals(request.getCommandAcknowledged()) && request.getAcknowledgedCommand() != null) {
      device.clearCommand();
    }

    device = deviceRepository.save(device);

    // AUDIT: Verificar si debería estar bloqueado
    boolean shouldBeBlocked = !company.allowsWriteOperations();
    boolean isBlocked = device.getStatus() == LicenseStatus.BLOCKED;

    if (shouldBeBlocked && !isBlocked) {
      // Registrar que el dispositivo debería estar bloqueado
      Map<String, Object> diagnostics = Map.of(
          "companyStatus", company.getStatus().name(),
          "graceUntil", company.getGraceUntil(),
          "expiresAt", company.getExpiresAt()
      );

      String reasonCode = company.getStatus() == CompanyStatus.EXPIRED ? "LICENSE_EXPIRED" :
                         company.getStatus() == CompanyStatus.BLOCKED ? "COMPANY_BLOCKED" :
                         "GRACE_PERIOD_ENDED";

      String reasonDesc = company.getStatus() == CompanyStatus.EXPIRED ? "Licencia expirada" :
                         company.getStatus() == CompanyStatus.BLOCKED ? "Empresa bloqueada administrativamente" :
                         "Período de gracia finalizado";

      auditService.recordAutoBlock(
          company.getId(),
          device.getDeviceFingerprint(),
          reasonCode,
          reasonDesc,
          diagnostics
      );

      // Bloquear el dispositivo
      device.setStatus(LicenseStatus.BLOCKED);
      deviceRepository.save(device);
    }

    // Determinar comando remoto si aplica
    RemoteCommand command = determineRemoteCommand(company, device);
    String commandPayload = null;

    if (command != null) {
      device.queueCommand(command.name(), null);
      deviceRepository.save(device);

      switch (command) {
        case SHOW_ADMIN_MESSAGE -> commandPayload = company.getCustomerMessage();
        case PAYMENT_REMINDER -> commandPayload = "Su licencia vence el " + company.getExpiresAt();
        default -> commandPayload = null;
      }
    }

    // Construir respuesta
    List<String> enabledModules = moduleRepository.findByCompanyIdAndEnabled(company.getId(), true)
        .stream()
        .filter(CompanyModule::isActive)
        .map(m -> m.getModuleType().name())
        .toList();

    return HeartbeatResponse.builder()
        .companyId(company.getId())
        .status(company.getStatus())
        .plan(company.getPlan())
        .expiresAt(company.getExpiresAt())
        .graceUntil(company.getGraceUntil())
        .enabledModules(enabledModules)
        .command(command)
        .commandPayload(commandPayload)
        .message(company.getCustomerMessage())
        .allowOperations(company.allowsWriteOperations())
        .allowSync(company.getPlan() != PlanType.LOCAL && company.isLicenseActive())
        .nextHeartbeatMinutes(30)
        .build();
  }

  // ==================== PRIVATE METHODS ====================

  private void createDefaultModules(Company company) {
    List<CompanyModule> modules = new ArrayList<>();

    // LOCAL: Solo impresión local
    modules.add(createModule(company, ModuleType.LOCAL_PRINTING, true));

    if (company.getPlan() == PlanType.SYNC || company.getPlan() == PlanType.PRO || company.getPlan() == PlanType.ENTERPRISE) {
      modules.add(createModule(company, ModuleType.CLOUD_SYNC, true));
      modules.add(createModule(company, ModuleType.DASHBOARD, true));
      modules.add(createModule(company, ModuleType.CLOUD_BACKUP, true));
    }

    if (company.getPlan() == PlanType.PRO || company.getPlan() == PlanType.ENTERPRISE) {
      modules.add(createModule(company, ModuleType.MULTI_LOCATION, true));
      modules.add(createModule(company, ModuleType.ADVANCED_AUDIT, true));
      modules.add(createModule(company, ModuleType.CUSTOM_REPORTS, true));
    }

    moduleRepository.saveAll(modules);
  }

  private CompanyModule createModule(Company company, ModuleType type, boolean enabled) {
    CompanyModule module = new CompanyModule();
    module.setCompany(company);
    module.setModuleType(type);
    module.setEnabled(enabled);
    return module;
  }

  private String generateLicenseKey(UUID companyId, String deviceFingerprint) {
    try {
      String data = companyId.toString() + ":" + deviceFingerprint + ":" + System.currentTimeMillis();
      return Base64.getUrlEncoder().withoutPadding().encodeToString(
          MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 not available", e);
    }
  }

  private String signLicense(UUID companyId, String deviceFingerprint, String licenseKey, OffsetDateTime expiresAt) {
    try {
      if (privateKeyBase64 == null || privateKeyBase64.isBlank()) {
        // Fallback: usar hash simple si no hay clave configurada (solo desarrollo)
        log.warn("No private key configured, using development signing");
        String data = companyId + ":" + deviceFingerprint + ":" + licenseKey + ":" + expiresAt;
        return Base64.getEncoder().encodeToString(
            MessageDigest.getInstance("SHA-256").digest(data.getBytes()));
      }

      byte[] privateKeyBytes = Base64.getDecoder().decode(privateKeyBase64);
      KeyFactory keyFactory = KeyFactory.getInstance("RSA");
      PrivateKey privateKey = keyFactory.generatePrivate(new PKCS8EncodedKeySpec(privateKeyBytes));

      Signature signature = Signature.getInstance("SHA256withRSA");
      signature.initSign(privateKey);

      String data = companyId + ":" + deviceFingerprint + ":" + licenseKey + ":" + expiresAt;
      signature.update(data.getBytes(StandardCharsets.UTF_8));

      return Base64.getEncoder().encodeToString(signature.sign());
    } catch (Exception e) {
      log.error("Error signing license", e);
      throw new RuntimeException("Error al firmar licencia", e);
    }
  }

  private boolean verifySignature(UUID companyId, String deviceFingerprint, String licenseKey,
                                  OffsetDateTime expiresAt, String providedSignature) {
    try {
      if (publicKeyBase64 == null || publicKeyBase64.isBlank()) {
        // Fallback en desarrollo: comparar hash simple
        String data = companyId + ":" + deviceFingerprint + ":" + licenseKey + ":" + expiresAt;
        String expected = Base64.getEncoder().encodeToString(
            MessageDigest.getInstance("SHA-256").digest(data.getBytes()));
        return expected.equals(providedSignature);
      }

      byte[] publicKeyBytes = Base64.getDecoder().decode(publicKeyBase64);
      KeyFactory keyFactory = KeyFactory.getInstance("RSA");
      PublicKey publicKey = keyFactory.generatePublic(new X509EncodedKeySpec(publicKeyBytes));

      Signature signature = Signature.getInstance("SHA256withRSA");
      signature.initVerify(publicKey);

      String data = companyId + ":" + deviceFingerprint + ":" + licenseKey + ":" + expiresAt;
      signature.update(data.getBytes(StandardCharsets.UTF_8));

      return signature.verify(Base64.getDecoder().decode(providedSignature));
    } catch (Exception e) {
      log.error("Error verifying signature", e);
      return false;
    }
  }

  private RemoteCommand determineRemoteCommand(Company company, LicensedDevice device) {
    // Si hay comando pendiente no confirmado, no enviar otro
    if (device.getPendingCommand() != null && !Boolean.TRUE.equals(device.getCommandAcknowledged())) {
      return null;
    }

    // Verificar estado de la empresa
    if (company.getStatus() == CompanyStatus.BLOCKED) {
      return RemoteCommand.BLOCK_SYSTEM;
    }

    if (company.getStatus() == CompanyStatus.EXPIRED) {
      return RemoteCommand.REQUEST_RENEWAL;
    }

    if (company.getStatus() == CompanyStatus.PAST_DUE && company.getCustomerMessage() != null) {
      return RemoteCommand.SHOW_ADMIN_MESSAGE;
    }

    // Recordatorio de pago si vence en menos de 7 días
    if (company.getExpiresAt() != null &&
        company.getExpiresAt().isBefore(OffsetDateTime.now().plusDays(7)) &&
        company.getStatus() == CompanyStatus.ACTIVE) {
      return RemoteCommand.PAYMENT_REMINDER;
    }

    return null;
  }

  private CompanyResponse mapToCompanyResponse(Company company) {
    List<CompanyModuleResponse> modules = moduleRepository.findByCompanyId(company.getId())
        .stream()
        .map(m -> CompanyModuleResponse.builder()
            .id(m.getId())
            .moduleType(m.getModuleType())
            .enabled(m.getEnabled())
            .enabledAt(m.getEnabledAt())
            .expiresAt(m.getExpiresAt())
            .active(m.isActive())
            .build())
        .toList();

    List<LicensedDeviceResponse> devices = deviceRepository.findByCompanyId(company.getId())
        .stream()
        .map(d -> LicensedDeviceResponse.builder()
            .id(d.getId())
            .deviceFingerprint(d.getDeviceFingerprint())
            .hostname(d.getHostname())
            .operatingSystem(d.getOperatingSystem())
            .appVersion(d.getAppVersion())
            .status(d.getStatus())
            .expiresAt(d.getExpiresAt())
            .lastHeartbeatAt(d.getLastHeartbeatAt())
            .lastSeenAt(d.getLastSeenAt())
            .isCurrentlyOnline(d.getIsCurrentlyOnline())
            .heartbeatCount(d.getHeartbeatCount())
            .pendingSyncEvents(d.getPendingSyncEvents())
            .syncedEvents(d.getSyncedEvents())
            .createdAt(d.getCreatedAt())
            .build())
        .toList();

    return CompanyResponse.builder()
        .id(company.getId())
        .name(company.getName())
        .nit(company.getNit())
        .address(company.getAddress())
        .city(company.getCity())
        .phone(company.getPhone())
        .email(company.getEmail())
        .contactName(company.getContactName())
        .plan(company.getPlan())
        .status(company.getStatus())
        .expiresAt(company.getExpiresAt())
        .graceUntil(company.getGraceUntil())
        .maxDevices(company.getMaxDevices())
        .maxLocations(company.getMaxLocations())
        .maxUsers(company.getMaxUsers())
        .offlineModeAllowed(company.getOfflineModeAllowed())
        .offlineLeaseHours(company.getOfflineLeaseHours())
        .modules(modules)
        .devices(devices)
        .createdAt(company.getCreatedAt())
        .updatedAt(company.getUpdatedAt())
        .customerMessage(company.getCustomerMessage())
        .build();
  }
}
