package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.application.port.in.HelmetHandlingUseCase;
import com.parkflow.modules.configuration.dto.HelmetHandlingRequest;
import com.parkflow.modules.configuration.dto.HelmetHandlingResponse;
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
@RequestMapping("/api/v1/configuration/helmet-handling")
@RequiredArgsConstructor
@Tag(name = "Configuration - Helmet Handling", description = "Manage helmet/locker handling mode")
public class HelmetHandlingController {

  private final HelmetHandlingUseCase helmetHandlingUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  @Operation(summary = "Get helmet handling configuration")
  @ApiResponse(
      responseCode = "200",
      description = "Helmet handling configuration retrieved successfully",
      content = @Content(schema = @Schema(implementation = HelmetHandlingResponse.class)))
  public ResponseEntity<HelmetHandlingResponse> getHelmetHandling(
      @RequestParam UUID companyId) {
    return ResponseEntity.ok(helmetHandlingUseCase.getHelmetHandling(companyId));
  }

  @PatchMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Update helmet handling mode")
  @ApiResponse(
      responseCode = "200",
      description = "Helmet handling updated successfully",
      content = @Content(schema = @Schema(implementation = HelmetHandlingResponse.class)))
  @ApiResponse(
      responseCode = "409",
      description = "Cannot change helmet mode: lockers have usage history")
  @ApiResponse(responseCode = "404", description = "Company not found")
  public ResponseEntity<HelmetHandlingResponse> updateHelmetHandling(
      @RequestParam UUID companyId,
      @Valid @RequestBody HelmetHandlingRequest request) {
    return ResponseEntity.ok(helmetHandlingUseCase.updateHelmetHandling(companyId, request));
  }
}
