package com.parkflow.modules.onboarding.presentation.controllers;

import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
import com.parkflow.modules.onboarding.dto.SaveOnboardingStepRequest;
import com.parkflow.modules.onboarding.application.port.in.OnboardingUseCase;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/onboarding")
@RequiredArgsConstructor
public class OnboardingController {

  private final OnboardingUseCase onboardingUseCase;

  @GetMapping("/companies/{companyId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<OnboardingStatusResponse> status(@PathVariable UUID companyId) {
    return ResponseEntity.ok(onboardingUseCase.status(companyId));
  }

  @PutMapping("/companies/{companyId}/steps")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<OnboardingStatusResponse> saveStep(
      @PathVariable UUID companyId,
      @Valid @RequestBody SaveOnboardingStepRequest request) {
    return ResponseEntity.ok(onboardingUseCase.saveOnboardingStep(companyId, request.step(), request.data()));
  }

  @PostMapping("/companies/{companyId}/skip")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<OnboardingStatusResponse> skip(@PathVariable UUID companyId) {
    return ResponseEntity.ok(onboardingUseCase.skipAndApplyDefaults(companyId));
  }

  @PostMapping("/companies/{companyId}/complete")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<OnboardingStatusResponse> complete(@PathVariable UUID companyId) {
    return ResponseEntity.ok(onboardingUseCase.completeOnboarding(companyId));
  }

  @PostMapping("/companies/{companyId}/reset")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<OnboardingStatusResponse> reset(
      @PathVariable UUID companyId,
      @RequestParam(required = false) String reason) {
    return ResponseEntity.ok(onboardingUseCase.resetOnboarding(companyId, reason));
  }

  @GetMapping("/companies/{companyId}/features/{featureKey}/enabled")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<Map<String, Boolean>> isFeatureEnabled(
      @PathVariable UUID companyId, @PathVariable String featureKey) {
    return ResponseEntity.ok(Map.of("enabled", onboardingUseCase.isFeatureEnabled(companyId, featureKey)));
  }

  @GetMapping("/companies/{companyId}/settings")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<Map<String, Object>> getCompanySettings(@PathVariable UUID companyId) {
    return ResponseEntity.ok(onboardingUseCase.getCompanySettings(companyId));
  }

  @GetMapping("/companies/{companyId}/capabilities")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<CompanyCapabilitiesResponse> getCapabilities(@PathVariable UUID companyId) {
    return ResponseEntity.ok(onboardingUseCase.getCapabilities(companyId));
  }
}
