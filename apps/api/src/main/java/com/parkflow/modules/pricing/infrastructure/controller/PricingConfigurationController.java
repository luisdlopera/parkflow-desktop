package com.parkflow.modules.pricing.infrastructure.controller;

import com.parkflow.modules.common.dto.RateStatusRequest;
import com.parkflow.modules.common.dto.PageResponse;
import com.parkflow.modules.pricing.application.PricingConfigurationFacadeService;
import com.parkflow.modules.pricing.dto.PricingEngineV1Request;
import com.parkflow.modules.pricing.dto.PricingEngineV1Response;
import com.parkflow.modules.pricing.dto.PricingSimulationRequest;
import com.parkflow.modules.pricing.dto.PricingSimulationResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.data.domain.Pageable;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.data.web.PageableDefault;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "PricingConfiguration", description = "PricingConfiguration endpoints")
@RequestMapping("/api/v1/pricing-configurations")
@RequiredArgsConstructor
public class PricingConfigurationController {
  private final PricingConfigurationFacadeService service;

  @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public PageResponse<PricingEngineV1Response> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @PageableDefault(size = 20) Pageable pageable) {
    return service.list(site, q, active, pageable);
  }

  @GetMapping("/{id}")
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public PricingEngineV1Response get(@PathVariable UUID id) {
    return service.get(id);
  }

  @PostMapping
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public PricingEngineV1Response create(@Valid @RequestBody PricingEngineV1Request request) {
    return service.create(request);
  }

  @PutMapping("/{id}")
  @Operation(summary = "PUT endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public PricingEngineV1Response update(@PathVariable UUID id, @Valid @RequestBody PricingEngineV1Request request) {
    return service.update(id, request);
  }

  @PatchMapping("/{id}/status")
  @Operation(summary = "PATCH endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public PricingEngineV1Response status(@PathVariable UUID id, @Valid @RequestBody RateStatusRequest request) {
    return service.patchStatus(id, request);
  }

  @PostMapping("/simulate")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public PricingSimulationResponse simulate(@Valid @RequestBody PricingSimulationRequest request) {
    return service.simulate(request);
  }
}
