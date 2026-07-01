package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.CashRegisterUseCase;
import com.parkflow.modules.configuration.dto.CashRegisterRequest;
import com.parkflow.modules.configuration.dto.CashRegisterResponse;
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
@Tag(name = "ConfigurationCashRegister", description = "ConfigurationCashRegister endpoints")
@RequestMapping("/api/v1/configuration/cash-registers")
@RequiredArgsConstructor
public class ConfigurationCashRegisterController {

  private final CashRegisterUseCase cashRegisterUseCase;

  @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public PageResponse<CashRegisterResponse> list(
      @RequestParam(required = false) UUID siteId,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return cashRegisterUseCase.list(siteId, q, active, pageable);
  }

  @GetMapping("/{id}")
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public CashRegisterResponse get(@PathVariable UUID id) {
    return cashRegisterUseCase.get(id);
  }

  @PostMapping
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
  public CashRegisterResponse create(@Valid @RequestBody CashRegisterRequest req) {
    return cashRegisterUseCase.create(req);
  }

  @PutMapping("/{id}")
  @Operation(summary = "PUT endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public CashRegisterResponse update(
      @PathVariable UUID id,
      @Valid @RequestBody CashRegisterRequest req) {
    return cashRegisterUseCase.update(id, req);
  }

  @PatchMapping("/{id}/status")
  @Operation(summary = "PATCH endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public CashRegisterResponse patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    return cashRegisterUseCase.patchStatus(id, active);
  }
}
