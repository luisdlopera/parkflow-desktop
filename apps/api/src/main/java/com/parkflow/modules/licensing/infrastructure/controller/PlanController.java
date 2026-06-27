package com.parkflow.modules.licensing.infrastructure.controller;

import com.parkflow.modules.licensing.application.service.PlanService;
import com.parkflow.modules.licensing.dto.PlanRequest;
import com.parkflow.modules.licensing.dto.PlanResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * @deprecated Use PlanManagementUseCase and PlanQueryUseCase ports instead.
 * This controller wraps the deprecated {@link PlanService}.
 */
@Deprecated(since = "2.1.0", forRemoval = false)
@SuppressWarnings("deprecation")
@RestController
@RequestMapping("/api/v1/admin/plans")
@RequiredArgsConstructor
@Tag(name = "Admin - Plans", description = "SuperAdmin plan management with feature flags")
public class PlanController {

  private final PlanService planService;

  @GetMapping
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "List all plans")
  @ApiResponse(responseCode = "200", description = "List of plans retrieved successfully")
  public ResponseEntity<List<PlanResponse>> listPlans(
      @RequestParam(defaultValue = "false") boolean includeDeleted,
      @RequestParam(required = false) Boolean active) {
    return ResponseEntity.ok(planService.listPlans(includeDeleted, active));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Get plan detail")
  @ApiResponse(responseCode = "200", description = "Plan retrieved successfully")
  @ApiResponse(responseCode = "404", description = "Plan not found")
  public ResponseEntity<PlanResponse> getPlan(@PathVariable UUID id) {
    return ResponseEntity.ok(planService.getPlan(id));
  }

  @PostMapping
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Create a new plan")
  @ApiResponse(responseCode = "201", description = "Plan created successfully")
  @ApiResponse(responseCode = "409", description = "Plan code already exists")
  public ResponseEntity<PlanResponse> createPlan(@Valid @RequestBody PlanRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(planService.createPlan(request));
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Update an existing plan")
  @ApiResponse(responseCode = "200", description = "Plan updated successfully")
  @ApiResponse(responseCode = "404", description = "Plan not found")
  public ResponseEntity<PlanResponse> updatePlan(
      @PathVariable UUID id,
      @Valid @RequestBody PlanRequest request) {
    return ResponseEntity.ok(planService.updatePlan(id, request));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Soft delete a plan")
  @ApiResponse(responseCode = "204", description = "Plan soft-deleted successfully")
  @ApiResponse(responseCode = "400", description = "Cannot delete last active plan")
  @ApiResponse(responseCode = "404", description = "Plan not found")
  public ResponseEntity<Void> deletePlan(@PathVariable UUID id) {
    planService.deletePlan(id);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/{id}/toggle")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Toggle plan active/inactive status")
  @ApiResponse(responseCode = "200", description = "Plan status toggled successfully")
  @ApiResponse(responseCode = "400", description = "Cannot deactivate last active plan")
  public ResponseEntity<PlanResponse> togglePlan(@PathVariable UUID id) {
    return ResponseEntity.ok(planService.togglePlan(id));
  }

  @PostMapping("/{id}/duplicate")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Duplicate a plan with all its features")
  @ApiResponse(responseCode = "201", description = "Plan duplicated successfully")
  public ResponseEntity<PlanResponse> duplicatePlan(@PathVariable UUID id) {
    return ResponseEntity.status(HttpStatus.CREATED).body(planService.duplicatePlan(id));
  }
}
