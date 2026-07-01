package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.dto.PrepaidBalancePurchaseRequest;
import com.parkflow.modules.configuration.dto.PrepaidBalanceResponse;
import com.parkflow.modules.configuration.dto.PrepaidPackageRequest;
import com.parkflow.modules.configuration.dto.PrepaidPackageResponse;
import com.parkflow.modules.configuration.application.service.PrepaidService;
import com.parkflow.modules.common.dto.PageResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@SuppressWarnings("deprecation")
@RestController
@RequestMapping("/api/v1/configuration/prepaid")
@RequiredArgsConstructor
public class ConfigurationPrepaidController {

  private final PrepaidService service;

  // ===================================================================
  // Packages
  // ===================================================================

  @GetMapping("/packages")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR','CAJERO')")
  public PageResponse<PrepaidPackageResponse> listPackages(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return service.listPackages(site, q, active, pageable);
  }

  @GetMapping("/packages/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR','CAJERO')")
  public PrepaidPackageResponse getPackage(@PathVariable UUID id) {
    return service.getPackage(id);
  }

  @PostMapping("/packages")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public PrepaidPackageResponse createPackage(
      @Valid @RequestBody PrepaidPackageRequest req) {
    return service.createPackage(req);
  }

  @PutMapping("/packages/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public PrepaidPackageResponse updatePackage(
      @PathVariable UUID id, @Valid @RequestBody PrepaidPackageRequest req) {
    return service.updatePackage(id, req);
  }

  @PatchMapping("/packages/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public PrepaidPackageResponse patchPackageStatus(
      @PathVariable UUID id, @RequestParam boolean active) {
    return service.patchPackageStatus(id, active);
  }

  // ===================================================================
  // Balances
  // ===================================================================

  @GetMapping("/balance")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CAJERO','OPERADOR','AUDITOR')")
  public List<PrepaidBalanceResponse> getBalance(@RequestParam String plate) {
    return service.getBalancesByPlate(plate);
  }

  @PostMapping("/balance/purchase")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CAJERO')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public PrepaidBalanceResponse purchase(
      @Valid @RequestBody PrepaidBalancePurchaseRequest req) {
    return service.purchase(req);
  }

  @PatchMapping("/balance/{id}/deduct")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','CAJERO')")
  public PrepaidBalanceResponse deduct(
      @PathVariable UUID id, @RequestParam int minutes) {
    return service.deduct(id, minutes);
  }
}
