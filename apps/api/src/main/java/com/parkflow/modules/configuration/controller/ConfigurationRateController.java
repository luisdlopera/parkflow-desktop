package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.RateStatusRequest;
import com.parkflow.modules.settings.dto.RateUpsertRequest;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import com.parkflow.modules.settings.application.port.in.*;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/rates")
@RequiredArgsConstructor
public class ConfigurationRateController {

  private final ListRatesUseCase listRatesUseCase;
  private final GetRateUseCase getRateUseCase;
  private final CreateRateUseCase createRateUseCase;
  private final UpdateRateUseCase updateRateUseCase;
  private final PatchRateStatusUseCase patchRateStatusUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<SettingsPageResponse<RateResponse>> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @RequestParam(required = false) String category,
      Pageable pageable) {
    return ResponseEntity.ok(listRatesUseCase.list(site, q, active, category, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<RateResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(getRateUseCase.get(id));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<RateResponse> create(@Valid @RequestBody RateUpsertRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(createRateUseCase.create(req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<RateResponse> update(
      @PathVariable UUID id,
      @Valid @RequestBody RateUpsertRequest req) {
    return ResponseEntity.ok(updateRateUseCase.update(id, req));
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<RateResponse> patchStatus(
      @PathVariable UUID id,
      @RequestBody RateStatusRequest req) {
    return ResponseEntity.ok(patchRateStatusUseCase.patchStatus(id, req));
  }
}
