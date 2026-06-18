package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.application.port.in.ShiftConfigurationUseCase;
import com.parkflow.modules.configuration.dto.ShiftConfigurationRequest;
import com.parkflow.modules.configuration.dto.ShiftConfigurationResponse;
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
@RequestMapping("/api/v1/configuration/shifts")
@RequiredArgsConstructor
@Tag(name = "Configuration - Shifts", description = "Manage shift-based operations configuration")
public class ShiftConfigurationController {

  private final ShiftConfigurationUseCase shiftConfigurationUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  @Operation(summary = "Get shift configuration")
  @ApiResponse(
      responseCode = "200",
      description = "Shift configuration retrieved successfully",
      content = @Content(schema = @Schema(implementation = ShiftConfigurationResponse.class)))
  public ResponseEntity<ShiftConfigurationResponse> getShiftConfiguration() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(shiftConfigurationUseCase.getShiftConfiguration(companyId));
  }

  @PatchMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Update shift configuration")
  @ApiResponse(
      responseCode = "200",
      description = "Shift configuration updated successfully",
      content = @Content(schema = @Schema(implementation = ShiftConfigurationResponse.class)))
  @ApiResponse(responseCode = "400", description = "Invalid shift times")
  @ApiResponse(responseCode = "404", description = "Company not found")
  public ResponseEntity<ShiftConfigurationResponse> updateShiftConfiguration(
      @Valid @RequestBody ShiftConfigurationRequest request) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(
        shiftConfigurationUseCase.updateShiftConfiguration(companyId, request));
  }
}
