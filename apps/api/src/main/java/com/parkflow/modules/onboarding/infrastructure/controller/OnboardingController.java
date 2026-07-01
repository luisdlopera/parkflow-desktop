package com.parkflow.modules.onboarding.infrastructure.controller;

import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
import com.parkflow.modules.onboarding.dto.CompanySettingsResponse;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.SaveOnboardingStepRequest;
import com.parkflow.modules.onboarding.application.port.in.OnboardingProgressUseCase;
import com.parkflow.modules.onboarding.application.port.in.OnboardingQueryUseCase;
import com.parkflow.modules.onboarding.application.service.IdempotencyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/onboarding")
@RequiredArgsConstructor
@Tag(name = "Onboarding", description = "Company onboarding workflow management")
public class OnboardingController {

  private final OnboardingProgressUseCase onboardingProgressUseCase;
  private final OnboardingQueryUseCase onboardingQueryUseCase;
  private final IdempotencyService idempotencyService;

  @GetMapping("/companies/{companyId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Get onboarding status", description = "Retrieves current onboarding progress for a company")
  @ApiResponse(responseCode = "200", description = "Status retrieved")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public OnboardingStatusResponse status(@PathVariable UUID companyId) {
    return onboardingQueryUseCase.status(companyId);
  }

  @PutMapping("/companies/{companyId}/steps")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Save onboarding step", description = "Saves data for a specific onboarding step")
  @ApiResponse(responseCode = "200", description = "Step saved")
  @ApiResponse(responseCode = "400", description = "Invalid step data")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public OnboardingStatusResponse saveStep(
      @PathVariable UUID companyId,
      @Valid @RequestBody SaveOnboardingStepRequest request) {
    return onboardingProgressUseCase.saveOnboardingStep(companyId, request.step(), request.data(), request.targetStep());
  }

  @PostMapping("/companies/{companyId}/skip")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Skip remaining onboarding steps", description = "Applies default values and marks onboarding as complete")
  @ApiResponse(responseCode = "200", description = "Onboarding skipped")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public OnboardingStatusResponse skip(
      @PathVariable UUID companyId,
      @RequestHeader(value = "Idempotency-Key", required = false) UUID idempotencyKey) {
    if (idempotencyKey != null) {
      OnboardingStatusResponse cached = idempotencyService.getCachedResponse(idempotencyKey);
      if (cached != null) return cached;
    }
    OnboardingStatusResponse response = onboardingProgressUseCase.skipAndApplyDefaults(companyId);
    if (idempotencyKey != null) {
      idempotencyService.cacheResponse(idempotencyKey, response);
    }
    return response;
  }

  @PostMapping("/companies/{companyId}/complete")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Complete onboarding", description = "Marks onboarding as finished and activates company")
  @ApiResponse(responseCode = "200", description = "Onboarding completed")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public OnboardingStatusResponse complete(
      @PathVariable UUID companyId,
      @RequestHeader(value = "Idempotency-Key", required = false) UUID idempotencyKey) {
    if (idempotencyKey != null) {
      OnboardingStatusResponse cached = idempotencyService.getCachedResponse(idempotencyKey);
      if (cached != null) return cached;
    }
    OnboardingStatusResponse response = onboardingProgressUseCase.completeOnboarding(companyId);
    if (idempotencyKey != null) {
      idempotencyService.cacheResponse(idempotencyKey, response);
    }
    return response;
  }

  @PostMapping("/companies/{companyId}/reset")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Reset onboarding", description = "Resets onboarding progress and starts over")
  @ApiResponse(responseCode = "200", description = "Onboarding reset")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public OnboardingStatusResponse reset(
      @PathVariable UUID companyId,
      @RequestParam(required = false, defaultValue = "Reinicio manual") String reason) {
    return onboardingProgressUseCase.resetOnboarding(companyId, reason);
  }

  @GetMapping("/companies/{companyId}/features/{featureKey}/enabled")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  @Operation(summary = "Check if feature is enabled", description = "Checks if a specific feature is enabled for the company")
  @ApiResponse(responseCode = "200", description = "Feature status retrieved")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public com.parkflow.modules.onboarding.dto.FeatureEnabledResponse isFeatureEnabled(
      @PathVariable UUID companyId, @PathVariable String featureKey) {
    return new com.parkflow.modules.onboarding.dto.FeatureEnabledResponse(
        onboardingQueryUseCase.isFeatureEnabled(companyId, featureKey));
  }

  @GetMapping("/companies/{companyId}/settings")
  @PreAuthorize("isAuthenticated()")
  @Operation(summary = "Get company settings", description = "Retrieves all configured settings for the company")
  @ApiResponse(responseCode = "200", description = "Settings retrieved")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public CompanySettingsResponse getCompanySettings(@PathVariable UUID companyId) {
    return onboardingQueryUseCase.getCompanySettings(companyId);
  }

  @GetMapping("/companies/{companyId}/capabilities")
  @PreAuthorize("isAuthenticated()")
  @Operation(summary = "Get company capabilities", description = "Retrieves enabled features and capabilities for the company")
  @ApiResponse(responseCode = "200", description = "Capabilities retrieved")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public CompanyCapabilitiesResponse getCapabilities(@PathVariable UUID companyId) {
    return onboardingQueryUseCase.getCapabilities(companyId);
  }


}
