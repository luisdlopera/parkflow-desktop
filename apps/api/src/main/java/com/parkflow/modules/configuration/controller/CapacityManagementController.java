package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.application.port.in.CapacityManagementUseCase;
import com.parkflow.modules.configuration.dto.CapacityRequest;
import com.parkflow.modules.configuration.dto.CapacityResponse;
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
@RequestMapping("/api/v1/configuration/capacity")
@RequiredArgsConstructor
@Tag(name = "Configuration - Capacity", description = "Manage parking capacity settings")
public class CapacityManagementController {

  private final CapacityManagementUseCase capacityManagementUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  @Operation(summary = "Get current parking capacity configuration")
  @ApiResponse(
      responseCode = "200",
      description = "Capacity configuration retrieved successfully",
      content = @Content(schema = @Schema(implementation = CapacityResponse.class)))
  public ResponseEntity<CapacityResponse> getCapacity() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(capacityManagementUseCase.getCapacity(companyId));
  }

  @PatchMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Update parking capacity")
  @ApiResponse(
      responseCode = "200",
      description = "Capacity updated successfully",
      content = @Content(schema = @Schema(implementation = CapacityResponse.class)))
  @ApiResponse(responseCode = "400", description = "Invalid capacity value")
  @ApiResponse(responseCode = "404", description = "Company not found")
  public ResponseEntity<CapacityResponse> updateCapacity(
      @Valid @RequestBody CapacityRequest request) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(capacityManagementUseCase.updateCapacity(companyId, request));
  }
}
