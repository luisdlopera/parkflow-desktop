package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.application.port.in.AgreementUseCase;
import com.parkflow.modules.configuration.dto.AgreementRequest;
import com.parkflow.modules.configuration.dto.AgreementResponse;
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

  private final AgreementUseCase agreementUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<SettingsPageResponse<AgreementResponse>> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return ResponseEntity.ok(agreementUseCase.list(site, q, active, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<AgreementResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(agreementUseCase.get(id));
  }

  @GetMapping("/resolve")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CAJERO','OPERADOR','AUDITOR')")
  public ResponseEntity<AgreementResponse> resolve(@RequestParam String code) {
    return ResponseEntity.ok(agreementUseCase.resolveByCode(code));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<AgreementResponse> create(@Valid @RequestBody AgreementRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(agreementUseCase.create(req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<AgreementResponse> update(
      @PathVariable UUID id, @Valid @RequestBody AgreementRequest req) {
    return ResponseEntity.ok(agreementUseCase.update(id, req));
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<AgreementResponse> patchStatus(
      @PathVariable UUID id, @RequestParam boolean active) {
    return ResponseEntity.ok(agreementUseCase.patchStatus(id, active));
  }
}
