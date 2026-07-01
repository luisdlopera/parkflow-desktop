package com.parkflow.modules.licensing.infrastructure.controller;

import com.parkflow.modules.licensing.application.service.PlanLifecycleService;
import com.parkflow.modules.licensing.application.service.PlanQueryService;
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
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Plan management endpoints using decomposed services.
 * Refactored from deprecated PlanService to PlanQueryService + PlanLifecycleService.
 */
@RestController
@RequestMapping("/api/v1/admin/plans")
@RequiredArgsConstructor
@Tag(name = "Admin - Plans", description = "SuperAdmin plan management with feature flags")
public class PlanController {

  private final PlanQueryService planQueryService;
  private final PlanLifecycleService planLifecycleService;

  @GetMapping
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "List all plans")
  @ApiResponse(responseCode = "200", description = "List of plans retrieved successfully")
  public List<PlanResponse> listPlans(
      @RequestParam(defaultValue = "false") boolean includeDeleted,
      @RequestParam(required = false) Boolean active) {
    return planQueryService.listPlans(includeDeleted, active);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Get plan detail")
  @ApiResponse(responseCode = "200", description = "Plan retrieved successfully")
  @ApiResponse(responseCode = "404", description = "Plan not found")
  public PlanResponse getPlan(@PathVariable UUID id) {
    return planQueryService.getPlan(id);
  }

  @PostMapping
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Create a new plan")
  @ApiResponse(responseCode = "201", description = "Plan created successfully")
  @ApiResponse(responseCode = "409", description = "Plan code already exists")
  @ResponseStatus(HttpStatus.CREATED)
  public PlanResponse createPlan(@Valid @RequestBody PlanRequest request) {
    return planLifecycleService.createPlan(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Update an existing plan")
  @ApiResponse(responseCode = "200", description = "Plan updated successfully")
  @ApiResponse(responseCode = "404", description = "Plan not found")
  public PlanResponse updatePlan(
      @PathVariable UUID id,
      @Valid @RequestBody PlanRequest request) {
    return planLifecycleService.updatePlan(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Soft delete a plan")
  @ApiResponse(responseCode = "204", description = "Plan soft-deleted successfully")
  @ApiResponse(responseCode = "400", description = "Cannot delete last active plan")
  @ApiResponse(responseCode = "404", description = "Plan not found")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deletePlan(@PathVariable UUID id) {
    planLifecycleService.deletePlan(id);
  }

  @PatchMapping("/{id}/toggle")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Toggle plan active/inactive status")
  @ApiResponse(responseCode = "200", description = "Plan status toggled successfully")
  @ApiResponse(responseCode = "400", description = "Cannot deactivate last active plan")
  public PlanResponse togglePlan(@PathVariable UUID id) {
    return planLifecycleService.togglePlan(id);
  }

  @PostMapping("/{id}/duplicate")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @Operation(summary = "Duplicate a plan with all its features")
  @ApiResponse(responseCode = "201", description = "Plan duplicated successfully")
  @ResponseStatus(HttpStatus.CREATED)
  public PlanResponse duplicatePlan(@PathVariable UUID id) {
    return planLifecycleService.duplicatePlan(id);
  }
}
