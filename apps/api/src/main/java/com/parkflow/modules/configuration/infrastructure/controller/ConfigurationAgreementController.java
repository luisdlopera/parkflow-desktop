package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.dto.AgreementRequest;
import com.parkflow.modules.configuration.dto.AgreementResponse;
import com.parkflow.modules.configuration.application.service.AgreementService;
import com.parkflow.modules.common.dto.PageResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@SuppressWarnings("deprecation")
@RestController
@RequestMapping("/api/v1/configuration/agreements")
@RequiredArgsConstructor
public class ConfigurationAgreementController {

  private final AgreementService service;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public PageResponse<AgreementResponse> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return service.list(site, q, active, pageable);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public AgreementResponse get(@PathVariable UUID id) {
    return service.get(id);
  }

  /**
   * Endpoint de resolución por código — usado en caja al aplicar un convenio.
   * Accesible por CAJERO y OPERADOR.
   */
  @GetMapping("/resolve")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CAJERO','OPERADOR','AUDITOR')")
  public AgreementResponse resolve(@RequestParam String code) {
    return service.resolveByCode(code);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public AgreementResponse create(@Valid @RequestBody AgreementRequest req) {
    return service.create(req);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public AgreementResponse update(
      @PathVariable UUID id, @Valid @RequestBody AgreementRequest req) {
    return service.update(id, req);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public AgreementResponse patchStatus(
      @PathVariable UUID id, @RequestParam boolean active) {
    return service.patchStatus(id, active);
  }
}
