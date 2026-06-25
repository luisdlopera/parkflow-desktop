package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.application.port.in.AuditRecorderUseCase;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.LicenseAuditLog;
import com.parkflow.modules.licensing.domain.LicenseBlockEvent;
import com.parkflow.modules.licensing.domain.LicensedDevice;
import com.parkflow.modules.licensing.domain.repository.*;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for recording license audit events.
 * Handles recording of blocks, failures, and resolutions.
 * Single responsibility: Audit event recording.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditRecorderService implements AuditRecorderUseCase {

  private final LicenseBlockEventPort blockEventRepository;
  private final CompanyPort companyRepository;
  private final LicensedDevicePort deviceRepository;
  private final LicenseAuditLogPort auditLogRepository;

  @Transactional
  @Override
  public LicenseBlockEvent recordAutoBlock(
      UUID companyId,
      String deviceFingerprint,
      String reasonCode,
      String reasonDescription,
      Map<String, Object> diagnostics) {

    Company company = companyRepository.findById(companyId)
        .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada: " + companyId));

    LicensedDevice device = deviceRepository.findByDeviceFingerprint(deviceFingerprint)
        .orElse(null);

    LicenseBlockEvent event = LicenseBlockEvent.autoBlock(
        company, device, "AUTO_BLOCK", reasonCode, reasonDescription);

    // Añadir diagnósticos adicionales
    if (diagnostics != null) {
      if (diagnostics.containsKey("signatureValid")) {
        event.setSignatureValid((Boolean) diagnostics.get("signatureValid"));
      }
      if (diagnostics.containsKey("fingerprintValid")) {
        event.setFingerprintValid((Boolean) diagnostics.get("fingerprintValid"));
      }
      if (diagnostics.containsKey("tamperCheckPassed")) {
        event.setTamperCheckPassed((Boolean) diagnostics.get("tamperCheckPassed"));
      }
      if (diagnostics.containsKey("tamperViolationCount")) {
        event.setTamperViolationCount((Integer) diagnostics.get("tamperViolationCount"));
      }
      if (diagnostics.containsKey("tamperDetails")) {
        event.setTamperCheckDetails((String) diagnostics.get("tamperDetails"));
      }
    }

    LicenseBlockEvent saved = blockEventRepository.save(event);

    log.warn("[LICENSE_BLOCK] Empresa {} bloqueada. Razón: {}. Device: {}",
        companyId, reasonCode, deviceFingerprint);

    return saved;
  }

  @Transactional
  @Override
  public void recordFailedValidation(
      UUID companyId,
      String deviceFingerprint,
      String errorCode,
      String errorMessage,
      Map<String, Object> context) {

    // Solo registrar si es un error grave (no simple "no hay licencia")
    if (isSevereError(errorCode)) {
      Company company = companyRepository.findById(companyId).orElse(null);
      LicensedDevice device = deviceRepository.findByDeviceFingerprint(deviceFingerprint).orElse(null);

      if (company != null) {
        LicenseBlockEvent event = new LicenseBlockEvent();
        event.setCompany(company);
        event.setDevice(device);
        event.setEventType("VALIDATION_FAILED");
        event.setReasonCode(errorCode);
        event.setReasonDescription(errorMessage);
        event.setAutoBlocked(false);
        event.setCompanyStatusAtBlock(company.getStatus().name());

        if (context != null) {
          event.setTechnicalDetails(context.toString());
        }

        blockEventRepository.save(event);

        log.warn("[LICENSE_VALIDATION_FAILED] Empresa {}, Device {}, Error: {}",
            companyId, deviceFingerprint, errorCode);
      }
    }
  }

  @Transactional
  @Override
  public void recordPaymentAfterBlock(UUID companyId, String paymentReference, OffsetDateTime paymentDate) {
    var unresolvedBlocks = blockEventRepository.findUnresolvedByCompanyId(companyId);

    for (LicenseBlockEvent block : unresolvedBlocks) {
      block.setPaymentReceivedAfterBlock(true);
      block.setPaymentReference(paymentReference);
      block.setPaymentDate(paymentDate);
      blockEventRepository.save(block);

      log.info("[LICENSE_PAYMENT_AFTER_BLOCK] Pago {} recibido para empresa {} con bloqueo activo",
          paymentReference, companyId);
    }
  }

  @Transactional
  @Override
  public void resolveBlockEvent(
      UUID blockEventId,
      String resolvedBy,
      String notes,
      String correctiveAction) {

    LicenseBlockEvent event = blockEventRepository.findById(blockEventId)
        .orElseThrow(() -> new IllegalArgumentException("Evento no encontrado"));

    event.resolve(resolvedBy, notes, correctiveAction);
    blockEventRepository.save(event);

    log.info("[LICENSE_BLOCK_RESOLVED] Evento {} resuelto por {}. Acción: {}",
        blockEventId, resolvedBy, correctiveAction);

    // Registrar en auditoría general
    LicenseAuditLog auditLog = LicenseAuditLog.create(
        event.getCompany(),
        "BLOCK_RESOLVED",
        "Evento de bloqueo resuelto: " + notes,
        resolvedBy);
    auditLogRepository.save(auditLog);
  }

  @Transactional
  @Override
  public void markAsFalsePositive(UUID blockEventId, String resolvedBy, String notes) {
    LicenseBlockEvent event = blockEventRepository.findById(blockEventId)
        .orElseThrow(() -> new IllegalArgumentException("Evento no encontrado"));

    event.markAsFalsePositive(resolvedBy, notes);
    blockEventRepository.save(event);

    log.warn("[LICENSE_FALSE_POSITIVE] Evento {} marcado como falso positivo por {}. Notas: {}",
        blockEventId, resolvedBy, notes);
  }

  // ───── Helpers ─────

  private boolean isSevereError(String errorCode) {
    return errorCode.equals("INVALID_SIGNATURE") ||
           errorCode.equals("TIME_MANIPULATION") ||
           errorCode.equals("DEVICE_MISMATCH");
  }
}
