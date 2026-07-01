package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.OperationalParameterUseCase;
import com.parkflow.modules.configuration.dto.OperationalParameterRequest;
import com.parkflow.modules.configuration.dto.OperationalParameterResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "ConfigurationOperationalParameter", description = "ConfigurationOperationalParameter endpoints")
@RequestMapping("/api/v1/configuration/operational-parameters")
@RequiredArgsConstructor
public class ConfigurationOperationalParameterController {

  private final OperationalParameterUseCase operationalParameterUseCase;

  @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public OperationalParameterResponse getBySite(@RequestParam UUID siteId) {
    return operationalParameterUseCase.getBySite(siteId);
  }

  @PutMapping
  @Operation(summary = "PUT endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public OperationalParameterResponse createOrUpdate(
      @RequestParam UUID siteId,
      @Valid @RequestBody OperationalParameterRequest req) {
    return operationalParameterUseCase.createOrUpdate(siteId, req);
  }
}
