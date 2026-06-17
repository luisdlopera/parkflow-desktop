package com.parkflow.modules.onboarding.application.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("OnboardingService Unit Tests")
class OnboardingServiceUnitTest {

  @Mock private OnboardingProgressPort progressPort;
  @Mock private CompanyPort companyPort;
  @Mock private CompanySettingsService settingsService;

  @InjectMocks private OnboardingService service;

  private UUID companyId;
  private Company company;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    company = new Company();
    company.setId(companyId);
    company.setPlan(PlanType.SYNC);
  }

  @Test
  @DisplayName("Should save onboarding step with valid data")
  void testSaveStepValid() {
    OnboardingProgress progress = new OnboardingProgress();
    Map<String, Object> data = Map.of("capacity", 20);

    when(progressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));
    when(progressPort.save(any())).thenReturn(progress);

    assertDoesNotThrow(() -> service.saveOnboardingStep(companyId, 1, data, 1));
    verify(progressPort).save(any());
  }

  @Test
  @DisplayName("Should save multiple steps in sequence")
  void testSaveMultipleSteps() {
    OnboardingProgress progress = new OnboardingProgress();
    Map<String, Object> data = Map.of("capacity", 20);

    when(progressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));
    when(progressPort.save(any())).thenReturn(progress);

    assertDoesNotThrow(() -> {
      service.saveOnboardingStep(companyId, 1, data, 1);
      service.saveOnboardingStep(companyId, 2, Map.of("rates", "data"), 2);
    });

    verify(progressPort, times(2)).save(any());
  }

  @Test
  @DisplayName("Should complete onboarding when all steps done")
  void testCompleteOnboarding() {
    OnboardingProgress progress = new OnboardingProgress();
    when(progressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));
    when(progressPort.save(any())).thenReturn(progress);

    assertDoesNotThrow(() -> service.completeOnboarding(companyId));
    verify(progressPort).save(any());
  }

  @Test
  @DisplayName("Should reset onboarding progress with reason")
  void testResetOnboarding() {
    OnboardingProgress progress = new OnboardingProgress();
    when(progressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));
    when(progressPort.save(any())).thenReturn(progress);

    assertDoesNotThrow(() -> service.resetOnboarding(companyId, "User requested reset"));
    verify(progressPort).save(any());
  }
}
