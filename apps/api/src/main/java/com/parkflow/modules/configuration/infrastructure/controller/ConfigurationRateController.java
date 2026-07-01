package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.common.dto.RateResponse;
import com.parkflow.modules.common.dto.RateStatusRequest;
import com.parkflow.modules.common.dto.RateUpsertRequest;
import com.parkflow.modules.common.dto.PageResponse;
import com.parkflow.modules.settings.application.port.in.ListRatesUseCase;
import com.parkflow.modules.settings.application.port.in.GetRateUseCase;
import com.parkflow.modules.settings.application.port.in.CreateRateUseCase;
import com.parkflow.modules.settings.application.port.in.UpdateRateUseCase;
import com.parkflow.modules.settings.application.port.in.PatchRateStatusUseCase;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
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
  public PageResponse<RateResponse> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @RequestParam(required = false) String category,
      Pageable pageable) {
    java.util.UUID companyId = com.parkflow.modules.auth.security.TenantContext.getTenantId();
    return listRatesUseCase.list(site, q, active, category, companyId, pageable);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public RateResponse get(@PathVariable UUID id) {
    return getRateUseCase.get(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public RateResponse create(@Valid @RequestBody RateUpsertRequest req) {
    return createRateUseCase.create(req);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public RateResponse update(
      @PathVariable UUID id,
      @Valid @RequestBody RateUpsertRequest req) {
    return updateRateUseCase.update(id, req);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public RateResponse patchStatus(
      @PathVariable UUID id,
      @Valid @RequestBody RateStatusRequest req) {
    return patchRateStatusUseCase.patchStatus(id, req);
  }
}
