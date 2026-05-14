package com.parkflow.modules.onboarding.controller;

import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
import com.parkflow.modules.onboarding.dto.SaveOnboardingStepRequest;
import com.parkflow.modules.onboarding.service.OnboardingService;
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

  private final OnboardingService onboardingService;

  @GetMapping("/companies/{companyId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<OnboardingStatusResponse> status(@PathVariable UUID companyId) {
    return ResponseEntity.ok(onboardingService.status(companyId));
  }

  @PutMapping("/companies/{companyId}/steps")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<OnboardingStatusResponse> saveStep(
      @PathVariable UUID companyId,
      @Valid @RequestBody SaveOnboardingStepRequest request) {
    return ResponseEntity.ok(onboardingService.saveOnboardingStep(companyId, request.step(), request.data()));
  }

  @PostMapping("/companies/{companyId}/skip")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<OnboardingStatusResponse> skip(@PathVariable UUID companyId) {
    return ResponseEntity.ok(onboardingService.skipAndApplyDefaults(companyId));
  }

  @PostMapping("/companies/{companyId}/complete")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<OnboardingStatusResponse> complete(@PathVariable UUID companyId) {
    return ResponseEntity.ok(onboardingService.completeOnboarding(companyId));
  }

  @GetMapping("/companies/{companyId}/features/{featureKey}/enabled")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<Map<String, Boolean>> isFeatureEnabled(
      @PathVariable UUID companyId, @PathVariable String featureKey) {
    return ResponseEntity.ok(Map.of("enabled", onboardingService.isFeatureEnabled(companyId, featureKey)));
  }

  @GetMapping("/companies/{companyId}/settings")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<Map<String, Object>> getCompanySettings(@PathVariable UUID companyId) {
    return ResponseEntity.ok(onboardingService.getCompanySettings(companyId));
  }

  @GetMapping("/companies/{companyId}/capabilities")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<CompanyCapabilitiesResponse> getCapabilities(@PathVariable UUID companyId) {
    return ResponseEntity.ok(onboardingService.getCapabilities(companyId));
  }
}
