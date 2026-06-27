package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.ModuleConfigurationUseCase;
import com.parkflow.modules.configuration.dto.ModuleConfigurationRequest;
import com.parkflow.modules.configuration.dto.ModuleConfigurationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import com.parkflow.modules.auth.security.TenantContext;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/modules")
@RequiredArgsConstructor
@Tag(name = "Configuration - Modules", description = "Manage feature modules and toggles")
public class ModuleConfigurationController {

  private final ModuleConfigurationUseCase moduleConfigurationUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  @Operation(summary = "Get module configuration")
  @ApiResponse(
      responseCode = "200",
      description = "Module configuration retrieved successfully",
      content = @Content(schema = @Schema(implementation = ModuleConfigurationResponse.class)))
  public ResponseEntity<ModuleConfigurationResponse> getModuleConfiguration() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(moduleConfigurationUseCase.getModuleConfiguration(companyId));
  }

  @PatchMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Update module configuration")
  @ApiResponse(
      responseCode = "200",
      description = "Module configuration updated successfully",
      content = @Content(schema = @Schema(implementation = ModuleConfigurationResponse.class)))
  @ApiResponse(responseCode = "400", description = "Invalid module configuration or license restriction")
  @ApiResponse(responseCode = "404", description = "Company not found")
  public ResponseEntity<ModuleConfigurationResponse> updateModuleConfiguration(
      @Valid @RequestBody ModuleConfigurationRequest request) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(
        moduleConfigurationUseCase.updateModuleConfiguration(companyId, request));
  }
}
