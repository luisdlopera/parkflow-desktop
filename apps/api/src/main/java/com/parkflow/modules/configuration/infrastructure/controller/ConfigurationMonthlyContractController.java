package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.dto.MonthlyContractRequest;
import com.parkflow.modules.configuration.dto.MonthlyContractResponse;
import com.parkflow.modules.configuration.application.service.MonthlyContractService;
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
@RequestMapping("/api/v1/configuration/monthly-contracts")
@RequiredArgsConstructor
public class ConfigurationMonthlyContractController {

  private final MonthlyContractService service;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public PageResponse<MonthlyContractResponse> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String plate,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return service.list(site, plate, active, pageable);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public MonthlyContractResponse get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public MonthlyContractResponse create(
      @Valid @RequestBody MonthlyContractRequest req) {
    return service.create(req);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public MonthlyContractResponse update(
      @PathVariable UUID id, @Valid @RequestBody MonthlyContractRequest req) {
    return service.update(id, req);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public MonthlyContractResponse patchStatus(
      @PathVariable UUID id, @RequestParam boolean active) {
    return service.patchStatus(id, active);
  }
}
