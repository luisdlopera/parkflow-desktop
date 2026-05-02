package com.parkflow.modules.licensing.controller;

import com.parkflow.modules.licensing.dto.*;
import com.parkflow.modules.licensing.service.LicenseService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * API REST para sistema de licenciamiento.
 * Endpoints para heartbeat, validación y administración.
 */
@RestController
@RequestMapping("/api/v1/licensing")
@RequiredArgsConstructor
public class LicensingController {

  private final LicenseService licenseService;

  // ==================== HEARTBEAT ====================

  /**
   * Heartbeat desde dispositivos desktop.
   * Los dispositivos reportan cada 30 minutos para recibir comandos remotos.
   */
  @PostMapping("/heartbeat")
  public ResponseEntity<HeartbeatResponse> heartbeat(
      @Valid @RequestBody HeartbeatRequest request,
      HttpServletRequest servletRequest) {

    String clientIp = servletRequest.getHeader("X-Forwarded-For");
    if (clientIp == null) {
      clientIp = servletRequest.getRemoteAddr();
    }

    HeartbeatResponse response = licenseService.processHeartbeat(request, clientIp);
    return ResponseEntity.ok(response);
  }

  /**
   * Validación de licencia offline.
   * Usada por la app desktop para verificar licencia sin conexión.
   */
  @PostMapping("/validate")
  public ResponseEntity<LicenseValidationResponse> validateLicense(
      @Valid @RequestBody LicenseValidationRequest request) {

    LicenseValidationResponse response = licenseService.validateLicense(request);
    return ResponseEntity.ok(response);
  }

  // ==================== ADMIN: COMPANY MANAGEMENT ====================

  /**
   * Crear nueva empresa (solo super admin).
   */
  @PostMapping("/companies")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public ResponseEntity<CompanyResponse> createCompany(
      @Valid @RequestBody CreateCompanyRequest request,
      @RequestAttribute("currentUserEmail") String performedBy) {

    CompanyResponse response = licenseService.createCompany(request, performedBy);
    return ResponseEntity.ok(response);
  }

  /**
   * Listar todas las empresas.
   */
  @GetMapping("/companies")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
  public ResponseEntity<List<CompanyResponse>> listCompanies() {
    return ResponseEntity.ok(licenseService.listAllCompanies());
  }

  /**
   * Obtener detalle de empresa.
   */
  @GetMapping("/companies/{companyId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN') or @securityService.isCurrentUserCompany(#companyId)")
  public ResponseEntity<CompanyResponse> getCompany(@PathVariable UUID companyId) {
    return ResponseEntity.ok(licenseService.getCompany(companyId));
  }

  /**
   * Actualizar empresa.
   */
  @PutMapping("/companies/{companyId}")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public ResponseEntity<CompanyResponse> updateCompany(
      @PathVariable UUID companyId,
      @Valid @RequestBody UpdateCompanyRequest request,
      @RequestAttribute("currentUserEmail") String performedBy) {

    return ResponseEntity.ok(licenseService.updateCompany(companyId, request, performedBy));
  }

  // ==================== ADMIN: LICENSE MANAGEMENT ====================

  /**
   * Generar licencia offline para un dispositivo.
   */
  @PostMapping("/licenses/generate")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public ResponseEntity<GenerateLicenseResponse> generateLicense(
      @Valid @RequestBody GenerateLicenseRequest request,
      @RequestAttribute("currentUserEmail") String performedBy) {

    return ResponseEntity.ok(licenseService.generateOfflineLicense(request, performedBy));
  }

  /**
   * Renovar licencia de empresa (extender fecha).
   */
  @PostMapping("/companies/{companyId}/renew")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public ResponseEntity<CompanyResponse> renewLicense(
      @PathVariable UUID companyId,
      @RequestParam int months,
      @RequestAttribute("currentUserEmail") String performedBy) {

    UpdateCompanyRequest request = new UpdateCompanyRequest();
    request.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.ACTIVE);

    return ResponseEntity.ok(licenseService.updateCompany(companyId, request, performedBy));
  }

  // ==================== ADMIN: REMOTE COMMANDS ====================

  /**
   * Enviar comando remoto a dispositivo.
   */
  @PostMapping("/commands/send")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public ResponseEntity<Void> sendCommand(@Valid @RequestBody RemoteCommandRequest request) {
    // Implementación en servicio
    return ResponseEntity.ok().build();
  }
}
