package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.dto.AgreementRequest;
import com.parkflow.modules.configuration.dto.AgreementResponse;
import com.parkflow.modules.configuration.service.AgreementService;
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
@RequestMapping("/api/v1/configuration/agreements")
@RequiredArgsConstructor
public class ConfigurationAgreementController {

  private final AgreementService service;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<SettingsPageResponse<AgreementResponse>> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return ResponseEntity.ok(service.list(site, q, active, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<AgreementResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(service.get(id));
  }

  /**
   * Endpoint de resolución por código — usado en caja al aplicar un convenio.
   * Accesible por CAJERO y OPERADOR.
   */
  @GetMapping("/resolve")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CAJERO','OPERADOR','AUDITOR')")
  public ResponseEntity<AgreementResponse> resolve(@RequestParam String code) {
    return ResponseEntity.ok(service.resolveByCode(code));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<AgreementResponse> create(@Valid @RequestBody AgreementRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<AgreementResponse> update(
      @PathVariable UUID id, @Valid @RequestBody AgreementRequest req) {
    return ResponseEntity.ok(service.update(id, req));
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<AgreementResponse> patchStatus(
      @PathVariable UUID id, @RequestParam boolean active) {
    return ResponseEntity.ok(service.patchStatus(id, active));
  }
}
