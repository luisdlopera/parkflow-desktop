package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.FeatureConfigurationUseCase;
import com.parkflow.modules.configuration.dto.FeatureConfigurationRequest;
import com.parkflow.modules.configuration.dto.FeatureConfigurationResponse;
import com.parkflow.modules.auth.security.TenantContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/configuration/features")
@RequiredArgsConstructor
@Tag(name = "Configuration - Business Features", description = "Manage business feature toggles (convenios, prepagados, etc.)")
public class FeatureConfigurationController {

  private final FeatureConfigurationUseCase featureConfigurationUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  @Operation(summary = "Get business feature configuration")
  @ApiResponse(
      responseCode = "200",
      description = "Feature configuration retrieved successfully",
      content = @Content(schema = @Schema(implementation = FeatureConfigurationResponse.class)))
  public ResponseEntity<FeatureConfigurationResponse> getFeatureConfiguration() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(featureConfigurationUseCase.getFeatureConfiguration(companyId));
  }

  @PatchMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Update business feature configuration")
  @ApiResponse(
      responseCode = "200",
      description = "Feature configuration updated successfully",
      content = @Content(schema = @Schema(implementation = FeatureConfigurationResponse.class)))
  @ApiResponse(responseCode = "400", description = "Invalid feature configuration")
  @ApiResponse(responseCode = "404", description = "Company not found")
  public ResponseEntity<FeatureConfigurationResponse> updateFeatureConfiguration(
      @Valid @RequestBody FeatureConfigurationRequest request) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(
        featureConfigurationUseCase.updateFeatureConfiguration(companyId, request));
  }
}
