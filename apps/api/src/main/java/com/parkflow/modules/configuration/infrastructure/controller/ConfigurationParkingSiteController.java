package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.ParkingSiteUseCase;
import com.parkflow.modules.configuration.dto.ParkingSiteRequest;
import com.parkflow.modules.configuration.dto.ParkingSiteResponse;
import com.parkflow.modules.common.dto.SettingsPageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/parking-sites")
@RequiredArgsConstructor
public class ConfigurationParkingSiteController {

  private final ParkingSiteUseCase parkingSiteUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<SettingsPageResponse<ParkingSiteResponse>> list(
      @RequestParam(required = false) UUID companyId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    // If companyId not provided, resolve from TenantContext
    if (companyId == null) {
      companyId = com.parkflow.modules.auth.security.TenantContext.getTenantId();
    }
    return ResponseEntity.ok(parkingSiteUseCase.list(companyId, q, active, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<ParkingSiteResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(parkingSiteUseCase.get(id));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @com.parkflow.modules.auth.security.RequireModule(com.parkflow.modules.licensing.enums.ModuleType.MULTI_LOCATION)
  public ResponseEntity<ParkingSiteResponse> create(
      @Valid @RequestBody ParkingSiteRequest req) {
    UUID companyId = com.parkflow.modules.auth.security.TenantContext.getTenantId();
    if (companyId == null) {
      throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.status(HttpStatus.CREATED).body(parkingSiteUseCase.create(companyId, req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ParkingSiteResponse> update(
      @PathVariable UUID id,
      @Valid @RequestBody ParkingSiteRequest req) {
    return ResponseEntity.ok(parkingSiteUseCase.update(id, req));
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ParkingSiteResponse> patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    return ResponseEntity.ok(parkingSiteUseCase.patchStatus(id, active));
  }
}
