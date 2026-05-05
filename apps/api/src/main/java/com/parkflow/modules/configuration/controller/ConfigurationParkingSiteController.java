package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.dto.ParkingSiteRequest;
import com.parkflow.modules.configuration.dto.ParkingSiteResponse;
import com.parkflow.modules.configuration.service.ParkingSiteService;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
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

  private final ParkingSiteService parkingSiteService;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<SettingsPageResponse<ParkingSiteResponse>> list(
      @RequestParam(required = false) UUID companyId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return ResponseEntity.ok(parkingSiteService.list(companyId, q, active, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<ParkingSiteResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(parkingSiteService.get(id));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ParkingSiteResponse> create(
      @RequestParam UUID companyId,
      @Valid @RequestBody ParkingSiteRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(parkingSiteService.create(companyId, req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ParkingSiteResponse> update(
      @PathVariable UUID id,
      @Valid @RequestBody ParkingSiteRequest req) {
    return ResponseEntity.ok(parkingSiteService.update(id, req));
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ParkingSiteResponse> patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    return ResponseEntity.ok(parkingSiteService.patchStatus(id, active));
  }
}
