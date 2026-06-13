package com.parkflow.modules.onboarding.application.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import com.parkflow.modules.onboarding.domain.repository.CompanySettingsSnapshotPort;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.configuration.service.OperationalConfigurationService;
import com.parkflow.modules.auth.security.AuthPrincipal;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class OnboardingServiceTest {

  @Mock private CompanyPort companyRepository;
  @Mock private OnboardingProgressPort onboardingProgressPort;
  @Mock private CompanySettingsService companySettingsService;
  @Mock private CompanySettingsSnapshotPort companySettingsSnapshotPort;
  @Mock private AuditPort auditService;
  @Mock private OperationalConfigurationService operationalConfigurationService;
  @Mock private OnboardingQuestionConfigService onboardingQuestionConfigService;

  private OnboardingService onboardingService;
  private UUID companyId;
  private Company company;

  @BeforeEach
  void setup() {
    companyId = UUID.randomUUID();
    
    // Set up Spring Security Context
    AuthPrincipal principal = new AuthPrincipal(UUID.randomUUID(), companyId, "admin@parkflow.local", "ADMIN", Collections.emptyList());
    Authentication auth = mock(Authentication.class);
    lenient().when(auth.getPrincipal()).thenReturn(principal);
    SecurityContextHolder.getContext().setAuthentication(auth);

    onboardingService = new OnboardingService(
        companyRepository,
        onboardingProgressPort,
        companySettingsService,
        new FeatureAccessService(),
        companySettingsSnapshotPort,
        auditService,
        operationalConfigurationService,
        onboardingQuestionConfigService,
        new OnboardingSettingsMapper(new FeatureAccessService())
    );

    company = new Company();
    company.setId(companyId);
    company.setPlan(PlanType.LOCAL);
    company.setOnboardingCompleted(false);
    company.setOperationalProfile(OperationalProfile.MIXED);

    lenient().when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    lenient().when(onboardingProgressPort.save(any(OnboardingProgress.class))).thenAnswer(inv -> inv.getArgument(0));
    lenient().when(companyRepository.save(any(Company.class))).thenAnswer(inv -> inv.getArgument(0));
  }

  @Test
  void saveStep_persistsPartialProgress() {
    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(1);
    progress.setProgressData(new LinkedHashMap<>());
    when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));

    OnboardingStatusResponse response = onboardingService.saveOnboardingStep(companyId, 1, Map.of("operationalProfile", "MIXED"));

    assertEquals(2, response.currentStep());
    assertTrue(response.progressData().containsKey("step_1"));
    verify(onboardingProgressPort, times(1)).save(any(OnboardingProgress.class));
  }

  @Test
  void skip_appliesDefaultAndCompletes() {
    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(1);
    progress.setProgressData(new LinkedHashMap<>());
    when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));

    onboardingService.skipAndApplyDefaults(companyId);

    verify(companySettingsService, times(1)).upsertSettings(eq(company), anyMap());
    assertTrue(company.getOnboardingCompleted());
    verify(companyRepository, times(2)).save(company);
  }
}
