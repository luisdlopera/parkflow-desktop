package com.parkflow.modules.pricing.infrastructure.controller;

import com.parkflow.modules.common.dto.RateStatusRequest;
import com.parkflow.modules.common.dto.SettingsPageResponse;
import com.parkflow.modules.pricing.application.PricingConfigurationFacadeService;
import com.parkflow.modules.pricing.dto.PricingEngineV1Request;
import com.parkflow.modules.pricing.dto.PricingEngineV1Response;
import com.parkflow.modules.pricing.dto.PricingSimulationRequest;
import com.parkflow.modules.pricing.dto.PricingSimulationResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/pricing-configurations")
@RequiredArgsConstructor
public class PricingConfigurationController {
  private final PricingConfigurationFacadeService service;

  @GetMapping
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public SettingsPageResponse<PricingEngineV1Response> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @PageableDefault(size = 20) Pageable pageable) {
    return service.list(site, q, active, pageable);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public PricingEngineV1Response get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public PricingEngineV1Response create(@Valid @RequestBody PricingEngineV1Request request) {
    return service.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public PricingEngineV1Response update(@PathVariable UUID id, @Valid @RequestBody PricingEngineV1Request request) {
    return service.update(id, request);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public PricingEngineV1Response status(@PathVariable UUID id, @Valid @RequestBody RateStatusRequest request) {
    return service.patchStatus(id, request);
  }

  @PostMapping("/simulate")
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public PricingSimulationResponse simulate(@Valid @RequestBody PricingSimulationRequest request) {
    return service.simulate(request);
  }
}
