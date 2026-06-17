package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.application.port.in.RegionConfigurationUseCase;
import com.parkflow.modules.configuration.dto.RegionConfigurationRequest;
import com.parkflow.modules.configuration.dto.RegionConfigurationResponse;
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
@RequestMapping("/api/v1/configuration/region")
@RequiredArgsConstructor
@Tag(name = "Configuration - Region", description = "Manage regional settings and localization")
public class RegionConfigurationController {

  private final RegionConfigurationUseCase regionConfigurationUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  @Operation(summary = "Get region configuration")
  @ApiResponse(
      responseCode = "200",
      description = "Region configuration retrieved successfully",
      content = @Content(schema = @Schema(implementation = RegionConfigurationResponse.class)))
  public ResponseEntity<RegionConfigurationResponse> getRegionConfiguration(
      @RequestParam UUID companyId) {
    return ResponseEntity.ok(regionConfigurationUseCase.getRegionConfiguration(companyId));
  }

  @PatchMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Update region configuration")
  @ApiResponse(
      responseCode = "200",
      description = "Region configuration updated successfully",
      content = @Content(schema = @Schema(implementation = RegionConfigurationResponse.class)))
  @ApiResponse(responseCode = "400", description = "Invalid region configuration")
  @ApiResponse(responseCode = "404", description = "Company not found")
  public ResponseEntity<RegionConfigurationResponse> updateRegionConfiguration(
      @RequestParam UUID companyId,
      @Valid @RequestBody RegionConfigurationRequest request) {
    return ResponseEntity.ok(
        regionConfigurationUseCase.updateRegionConfiguration(companyId, request));
  }
}
