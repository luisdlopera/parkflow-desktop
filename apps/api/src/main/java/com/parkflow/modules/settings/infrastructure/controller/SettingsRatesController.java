package com.parkflow.modules.settings.infrastructure.controller;

import com.parkflow.modules.common.dto.*;
import com.parkflow.modules.settings.application.port.in.RateManagementUseCase;
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
@Tag(name = "SettingsRates", description = "SettingsRates endpoints")
@RequestMapping("/api/v1/settings/rates")
@Deprecated(since = "2.1.0", forRemoval = false)
@RequiredArgsConstructor
public class SettingsRatesController {
  private final RateManagementUseCase rateManagementUseCase;

  @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public PageResponse<RateResponse> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @RequestParam(required = false) String category,
      @PageableDefault(size = 20) Pageable pageable) {
    return rateManagementUseCase.list(site, q, active, category, pageable);
  }

  @GetMapping("/{id}")
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public RateResponse get(@PathVariable UUID id) {
    return rateManagementUseCase.get(id);
  }

  @PostMapping
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public RateResponse create(@Valid @RequestBody RateUpsertRequest request) {
    return rateManagementUseCase.create(request);
  }

  @PatchMapping("/{id}")
  @Operation(summary = "PATCH endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public RateResponse update(@PathVariable UUID id, @Valid @RequestBody RateUpsertRequest request) {
    return rateManagementUseCase.update(id, request);
  }

  @PatchMapping("/{id}/status")
  @Operation(summary = "PATCH endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public RateResponse status(@PathVariable UUID id, @Valid @RequestBody RateStatusRequest request) {
    return rateManagementUseCase.patchStatus(id, request);
  }

  @DeleteMapping("/{id}")
  @Operation(summary = "DELETE endpoint")
  @ApiResponse(responseCode = "204", description = "Deleted")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "404", description = "Not Found")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public void delete(@PathVariable UUID id) {
    // Implementado en el puerto como inactivación si tiene referencias
    rateManagementUseCase.patchStatus(id, new RateStatusRequest(false));
  }
}
