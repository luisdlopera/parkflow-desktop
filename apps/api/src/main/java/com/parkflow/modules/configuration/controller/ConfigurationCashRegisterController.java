package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.application.port.in.CashRegisterUseCase;
import com.parkflow.modules.configuration.dto.CashRegisterRequest;
import com.parkflow.modules.configuration.dto.CashRegisterResponse;
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
@RequestMapping("/api/v1/configuration/cash-registers")
@RequiredArgsConstructor
public class ConfigurationCashRegisterController {

  private final CashRegisterUseCase cashRegisterUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<SettingsPageResponse<CashRegisterResponse>> list(
      @RequestParam(required = false) UUID siteId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return ResponseEntity.ok(cashRegisterUseCase.list(siteId, q, active, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<CashRegisterResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(cashRegisterUseCase.get(id));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<CashRegisterResponse> create(@Valid @RequestBody CashRegisterRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(cashRegisterUseCase.create(req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<CashRegisterResponse> update(
      @PathVariable UUID id,
      @Valid @RequestBody CashRegisterRequest req) {
    return ResponseEntity.ok(cashRegisterUseCase.update(id, req));
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<CashRegisterResponse> patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    return ResponseEntity.ok(cashRegisterUseCase.patchStatus(id, active));
  }
}
