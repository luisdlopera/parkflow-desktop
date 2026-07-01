package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.ParkingSiteUseCase;
import com.parkflow.modules.configuration.dto.ParkingSiteRequest;
import com.parkflow.modules.configuration.dto.ParkingSiteResponse;
import com.parkflow.modules.common.dto.PageResponse;
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
@Tag(name = "ConfigurationParkingSite", description = "ConfigurationParkingSite endpoints")
@RequestMapping("/api/v1/configuration/parking-sites")
@RequiredArgsConstructor
public class ConfigurationParkingSiteController {

  private final ParkingSiteUseCase parkingSiteUseCase;

  @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public PageResponse<ParkingSiteResponse> list(
      @RequestParam(required = false) UUID companyId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    // If companyId not provided, resolve from TenantContext
    if (companyId == null) {
      companyId = com.parkflow.modules.auth.security.TenantContext.getTenantId();
    }
    return parkingSiteUseCase.list(companyId, q, active, pageable);
  }

  @GetMapping("/{id}")
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ParkingSiteResponse get(@PathVariable UUID id) {
    return parkingSiteUseCase.get(id);
  }

  @PostMapping
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @com.parkflow.modules.auth.security.RequireModule(com.parkflow.modules.licensing.enums.ModuleType.MULTI_LOCATION)
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public ParkingSiteResponse create(
      @Valid @RequestBody ParkingSiteRequest req) {
    UUID companyId = com.parkflow.modules.auth.security.TenantContext.getTenantId();
    if (companyId == null) {
      throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return parkingSiteUseCase.create(companyId, req);
  }

  @PutMapping("/{id}")
  @Operation(summary = "PUT endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ParkingSiteResponse update(
      @PathVariable UUID id,
      @Valid @RequestBody ParkingSiteRequest req) {
    return parkingSiteUseCase.update(id, req);
  }

  @PatchMapping("/{id}/status")
  @Operation(summary = "PATCH endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ParkingSiteResponse patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    return parkingSiteUseCase.patchStatus(id, active);
  }
}
