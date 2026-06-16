package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.dto.VehicleTypeRequest;
import com.parkflow.modules.settings.dto.VehicleTypeResponse;
import com.parkflow.modules.settings.application.service.SettingsVehicleTypeService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/vehicle-types")
@RequiredArgsConstructor
public class ConfigurationVehicleTypeController {

  private final SettingsVehicleTypeService settingsVehicleTypeService;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR','CAJERO')")
  public ResponseEntity<List<VehicleTypeResponse>> listAll() {
    UUID companyId = resolveCompanyId();
    return ResponseEntity.ok(settingsVehicleTypeService.listByCompany(companyId));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<VehicleTypeResponse> create(@RequestBody Map<String, String> body) {
    String code = body != null ? body.get("code") : null;
    if (code == null || code.isBlank()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El código del tipo de vehículo es requerido");
    }
    UUID companyId = resolveCompanyId();
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(settingsVehicleTypeService.addTypeToCompany(companyId, code));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<VehicleTypeResponse> update(
      @PathVariable UUID id,
      @Valid @RequestBody VehicleTypeRequest req) {
    return ResponseEntity.ok(settingsVehicleTypeService.updateCompanyType(id, req));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    settingsVehicleTypeService.removeCompanyType(id);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<Void> patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    settingsVehicleTypeService.patchCompanyTypeStatus(id, active);
    return ResponseEntity.ok().build();
  }

  private UUID resolveCompanyId() {
    try {
      return SecurityUtils.requireCompanyId();
    } catch (Exception e) {
      throw new OperationException(HttpStatus.FORBIDDEN, "No se pudo determinar la empresa del usuario");
    }
  }
}
