package com.parkflow.modules.configuration.controller;

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
  public ResponseEntity<ModuleConfigurationResponse> getModuleConfiguration(
      @RequestParam UUID companyId) {
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
      @RequestParam UUID companyId,
      @Valid @RequestBody ModuleConfigurationRequest request) {
    return ResponseEntity.ok(
        moduleConfigurationUseCase.updateModuleConfiguration(companyId, request));
  }
}
