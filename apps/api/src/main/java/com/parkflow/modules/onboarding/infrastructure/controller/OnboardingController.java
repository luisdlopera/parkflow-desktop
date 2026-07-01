package com.parkflow.modules.onboarding.infrastructure.controller;

import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
import com.parkflow.modules.onboarding.dto.CompanySettingsResponse;
import com.parkflow.modules.onboarding.dto.SaveOnboardingStepRequest;
import com.parkflow.modules.onboarding.application.port.in.OnboardingProgressUseCase;
import com.parkflow.modules.onboarding.application.port.in.OnboardingQueryUseCase;
import com.parkflow.modules.onboarding.application.service.IdempotencyService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/onboarding")
@RequiredArgsConstructor
public class OnboardingController {

  private final OnboardingProgressUseCase onboardingProgressUseCase;
  private final OnboardingQueryUseCase onboardingQueryUseCase;
  private final IdempotencyService idempotencyService;

  @GetMapping("/companies/{companyId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public OnboardingStatusResponse status(@PathVariable UUID companyId) {
    return onboardingQueryUseCase.status(companyId);
  }

  @PutMapping("/companies/{companyId}/steps")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public OnboardingStatusResponse saveStep(
      @PathVariable UUID companyId,
      @Valid @RequestBody SaveOnboardingStepRequest request) {
    return onboardingProgressUseCase.saveOnboardingStep(companyId, request.step(), request.data(), request.targetStep());
  }

  @PostMapping("/companies/{companyId}/skip")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
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
  public OnboardingStatusResponse reset(
      @PathVariable UUID companyId,
      @RequestParam(required = false, defaultValue = "Reinicio manual") String reason) {
    return onboardingProgressUseCase.resetOnboarding(companyId, reason);
  }

  @GetMapping("/companies/{companyId}/features/{featureKey}/enabled")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public com.parkflow.modules.onboarding.dto.FeatureEnabledResponse isFeatureEnabled(
      @PathVariable UUID companyId, @PathVariable String featureKey) {
    return new com.parkflow.modules.onboarding.dto.FeatureEnabledResponse(
        onboardingQueryUseCase.isFeatureEnabled(companyId, featureKey));
  }

  @GetMapping("/companies/{companyId}/settings")
  @PreAuthorize("isAuthenticated()")
  public com.parkflow.modules.onboarding.dto.CompanySettingsResponse getCompanySettings(@PathVariable UUID companyId) {
    var settings = onboardingQueryUseCase.getCompanySettings(companyId);
    return CompanySettingsResponse.builder()
        .companyId(settings.getOrDefault("companyId", "").toString())
        .companyName(settings.getOrDefault("companyName", "").toString())
        .status(settings.getOrDefault("status", "ACTIVE").toString())
        .country(settings.getOrDefault("country", "CO").toString())
        .timezone(settings.getOrDefault("timezone", "America/Bogota").toString())
        .currency(settings.getOrDefault("currency", "COP").toString())
        .language(settings.getOrDefault("language", "es").toString())
        .features((java.util.Map<String, Boolean>) settings.getOrDefault("features", new java.util.HashMap<>()))
        .modules((java.util.Map<String, Boolean>) settings.getOrDefault("modules", new java.util.HashMap<>()))
        .customSettings((java.util.Map<String, Object>) settings.getOrDefault("customSettings", new java.util.HashMap<>()))
        .build();
  }

  @GetMapping("/companies/{companyId}/capabilities")
  @PreAuthorize("isAuthenticated()")
  public CompanyCapabilitiesResponse getCapabilities(@PathVariable UUID companyId) {
    return onboardingQueryUseCase.getCapabilities(companyId);
  }


}
