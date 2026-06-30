package com.parkflow.modules.pricing.infrastructure.controller;

import com.parkflow.modules.common.dto.RateStatusRequest;
import com.parkflow.modules.common.dto.SettingsPageResponse;
import com.parkflow.modules.pricing.application.PricingConfigurationMapper;
import com.parkflow.modules.pricing.dto.*;
import com.parkflow.modules.settings.application.port.in.*;
import jakarta.validation.Valid;
import java.math.BigDecimal;
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
  private final ListRatesUseCase listRatesUseCase;
  private final GetRateUseCase getRateUseCase;
  private final CreateRateUseCase createRateUseCase;
  private final UpdateRateUseCase updateRateUseCase;
  private final PatchRateStatusUseCase patchRateStatusUseCase;
  private final PricingConfigurationMapper mapper;

  @GetMapping
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public SettingsPageResponse<PricingConfigurationResponse> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @PageableDefault(size = 20) Pageable pageable) {
    var page = listRatesUseCase.list(site, q, active, "STANDARD", null, pageable);
    return new SettingsPageResponse<>(
        page.content().stream().map(mapper::toPricingResponse).toList(),
        page.totalElements(),
        page.totalPages(),
        page.page(),
        page.size());
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public PricingConfigurationResponse get(@PathVariable UUID id) {
    return mapper.toPricingResponse(getRateUseCase.get(id));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public PricingConfigurationResponse create(@Valid @RequestBody PricingConfigurationRequest request) {
    return mapper.toPricingResponse(createRateUseCase.create(mapper.toRateUpsert(request)));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public PricingConfigurationResponse update(
      @PathVariable UUID id, @Valid @RequestBody PricingConfigurationRequest request) {
    return mapper.toPricingResponse(updateRateUseCase.update(id, mapper.toRateUpsert(request)));
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public PricingConfigurationResponse status(@PathVariable UUID id, @Valid @RequestBody RateStatusRequest request) {
    return mapper.toPricingResponse(patchRateStatusUseCase.patchStatus(id, request));
  }

  @PostMapping("/simulate")
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public PricingSimulationResponse simulate(@Valid @RequestBody PricingSimulationRequest request) {
    long billable = Math.max(0, request.stayMinutes() - request.configuration().rules().graceMinutes());
    BigDecimal amount = mapper.toRateUpsert(request.configuration()).amount();
    int fraction = Math.max(1, mapper.toRateUpsert(request.configuration()).fractionMinutes());
    int units = (int) Math.max(1, Math.ceil((double) billable / fraction));
    return new PricingSimulationResponse(
        request.stayMinutes(),
        billable,
        units,
        amount.multiply(BigDecimal.valueOf(units)),
        request.configuration().currency() == null ? "COP" : request.configuration().currency());
  }
}
