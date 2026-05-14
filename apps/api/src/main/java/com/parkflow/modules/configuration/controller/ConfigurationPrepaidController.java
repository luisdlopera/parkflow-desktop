package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.configuration.dto.PrepaidBalancePurchaseRequest;
import com.parkflow.modules.configuration.dto.PrepaidBalanceResponse;
import com.parkflow.modules.configuration.dto.PrepaidPackageRequest;
import com.parkflow.modules.configuration.dto.PrepaidPackageResponse;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/prepaid")
@RequiredArgsConstructor
public class ConfigurationPrepaidController {

  private final PrepaidUseCase prepaidUseCase;

  // ===================================================================
  // Packages
  // ===================================================================

  @GetMapping("/packages")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR','CAJERO')")
  public ResponseEntity<SettingsPageResponse<PrepaidPackageResponse>> listPackages(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return ResponseEntity.ok(prepaidUseCase.listPackages(site, q, active, pageable));
  }

  @GetMapping("/packages/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR','CAJERO')")
  public ResponseEntity<PrepaidPackageResponse> getPackage(@PathVariable UUID id) {
    return ResponseEntity.ok(prepaidUseCase.getPackage(id));
  }

  @PostMapping("/packages")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<PrepaidPackageResponse> createPackage(
      @Valid @RequestBody PrepaidPackageRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(prepaidUseCase.createPackage(req));
  }

  @PutMapping("/packages/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<PrepaidPackageResponse> updatePackage(
      @PathVariable UUID id, @Valid @RequestBody PrepaidPackageRequest req) {
    return ResponseEntity.ok(prepaidUseCase.updatePackage(id, req));
  }

  @PatchMapping("/packages/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<PrepaidPackageResponse> patchPackageStatus(
      @PathVariable UUID id, @RequestParam boolean active) {
    return ResponseEntity.ok(prepaidUseCase.patchPackageStatus(id, active));
  }

  // ===================================================================
  // Balances
  // ===================================================================

  @GetMapping("/balance")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CAJERO','OPERADOR','AUDITOR')")
  public ResponseEntity<List<PrepaidBalanceResponse>> getBalance(@RequestParam String plate) {
    return ResponseEntity.ok(prepaidUseCase.getBalancesByPlate(plate));
  }

  @PostMapping("/balance/purchase")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CAJERO')")
  public ResponseEntity<PrepaidBalanceResponse> purchase(
      @Valid @RequestBody PrepaidBalancePurchaseRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(prepaidUseCase.purchase(req));
  }

  @PatchMapping("/balance/{id}/deduct")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CAJERO')")
  public ResponseEntity<PrepaidBalanceResponse> deduct(
      @PathVariable UUID id, @RequestParam int minutes) {
    return ResponseEntity.ok(prepaidUseCase.deduct(id, minutes));
  }
}
