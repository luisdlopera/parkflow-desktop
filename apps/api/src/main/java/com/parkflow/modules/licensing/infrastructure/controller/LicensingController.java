package com.parkflow.modules.licensing.infrastructure.controller;

import com.parkflow.modules.licensing.application.port.in.*;
import com.parkflow.modules.licensing.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * API REST para sistema de licenciamiento.
 * Endpoints para heartbeat, validación y administración.
 */
  @RestController
  @RequestMapping("/api/v1/licensing")
  @RequiredArgsConstructor
  @Tag(name = "Licensing", description = "License management, heartbeat, and company administration")
  public class LicensingController {

  private final HeartbeatUseCase heartbeatUseCase;
  private final ValidateLicenseUseCase validateLicenseUseCase;
  private final CompanyManagementUseCase companyManagementUseCase;
  private final GenerateLicenseUseCase generateLicenseUseCase;

  // ==================== HEARTBEAT ====================

  /**
   * Heartbeat desde dispositivos desktop.
   * Los dispositivos reportan cada 30 minutos para recibir comandos remotos.
   */
  @PostMapping("/heartbeat")
  @Operation(summary = "Desktop heartbeat", description = "Devices report every 30min to receive remote commands")
  @ApiResponse(responseCode = "200", description = "Heartbeat processed")
  @ApiResponse(responseCode = "429", description = "Rate limited")
  public HeartbeatResponse heartbeat(
      @Valid @RequestBody HeartbeatRequest request,
      HttpServletRequest servletRequest) {

    String clientIp = servletRequest.getHeader("X-Forwarded-For");
    if (clientIp == null) {
      clientIp = servletRequest.getRemoteAddr();
    }

    HeartbeatResponse response = heartbeatUseCase.processHeartbeat(request, clientIp);
    return response;
  }

  /**
   * Validación de licencia offline.
   * Usada por la app desktop para verificar licencia sin conexión.
   */
  @PostMapping("/validate")
  @Operation(summary = "Validate license offline", description = "Offline license validation for desktop app")
  @ApiResponse(responseCode = "200", description = "License valid")
  @ApiResponse(responseCode = "403", description = "License invalid or expired")
  public LicenseValidationResponse validateLicense(
      @Valid @RequestBody LicenseValidationRequest request) {

    LicenseValidationResponse response = validateLicenseUseCase.validateLicense(request);
    return response;
  }

  // ==================== ADMIN: COMPANY MANAGEMENT ====================

  /**
   * Crear nueva empresa (solo super admin).
   */
  @PostMapping("/companies")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Create company", description = "Create a new company (Super Admin only)")
  @ApiResponse(responseCode = "201", description = "Company created")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "403", description = "Forbidden - Super Admin only")
  public CompanyResponse createCompany(
    @Valid @RequestBody CreateCompanyRequest request,
      @RequestAttribute("currentUserEmail") String performedBy) {

    CompanyResponse response = companyManagementUseCase.createCompany(request, performedBy);
    return response;
  }

  /**
   * Listar todas las empresas.
   */
  @GetMapping("/companies")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
  @Operation(summary = "List all companies", description = "Retrieve all companies (Super Admin / Admin only)")
  @ApiResponse(responseCode = "200", description = "Companies listed")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public List<CompanyResponse> listCompanies() {
    return companyManagementUseCase.listAllCompanies();
  }

  /**
   * Obtener detalle de empresa.
   */
  @GetMapping("/companies/{companyId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN') or @securityService.isCurrentUserCompany(#companyId)")
  public CompanyResponse getCompany(@PathVariable UUID companyId) {
    return companyManagementUseCase.getCompany(companyId);
  }

  /**
   * Actualizar empresa.
   */
  @PutMapping("/companies/{companyId}")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public CompanyResponse updateCompany(
      @PathVariable UUID companyId,
      @Valid @RequestBody UpdateCompanyRequest request,
      @RequestAttribute("currentUserEmail") String performedBy) {

    return companyManagementUseCase.updateCompany(companyId, request, performedBy);
  }

  @DeleteMapping("/companies/{companyId}/deactivate")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deactivateCompany(
    @PathVariable UUID companyId,
    @RequestAttribute("currentUserEmail") String performedBy) {

    companyManagementUseCase.deactivateCompany(companyId, performedBy);
  }

  @DeleteMapping("/companies/{companyId}")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteCompany(
    @PathVariable UUID companyId,
    @RequestAttribute("currentUserEmail") String performedBy) {

    companyManagementUseCase.deleteCompany(companyId, performedBy);
  }

  @DeleteMapping({"/companies/{companyId:[0-9a-fA-F\\-]+}/purge", "/companies/{companyId:[0-9a-fA-F\\-]+}/purge/"})
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void purgeCompany(
    @PathVariable UUID companyId,
    @RequestAttribute("currentUserEmail") String performedBy) {

    companyManagementUseCase.purgeCompany(companyId, performedBy);
  }

  // ==================== ADMIN: LICENSE MANAGEMENT ====================

  /**
   * Generar licencia offline para un dispositivo.
   */
  @PostMapping("/licenses/generate")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public GenerateLicenseResponse generateLicense(
      @Valid @RequestBody GenerateLicenseRequest request,
      @RequestAttribute("currentUserEmail") String performedBy) {

    return generateLicenseUseCase.generateOfflineLicense(request, performedBy);
  }

  /**
   * Renovar licencia de empresa (extender fecha).
   */
  @PostMapping("/companies/{companyId}/renew")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public CompanyResponse renewLicense(
      @PathVariable UUID companyId,
      @RequestParam int months,
      @RequestAttribute("currentUserEmail") String performedBy) {

    UpdateCompanyRequest request = new UpdateCompanyRequest();
    request.setStatus(com.parkflow.modules.licensing.enums.CompanyStatus.ACTIVE);

    return companyManagementUseCase.updateCompany(companyId, request, performedBy);
  }

  // ==================== ADMIN: REMOTE COMMANDS ====================

  /**
   * Enviar comando remoto a dispositivo.
   */
  @PostMapping("/commands/send")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void sendCommand(@Valid @RequestBody RemoteCommandRequest request) {
    // Implementación en servicio
  }
}
