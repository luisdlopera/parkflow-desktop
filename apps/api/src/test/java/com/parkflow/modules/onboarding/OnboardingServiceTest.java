package com.parkflow.modules.onboarding;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import com.parkflow.modules.onboarding.application.service.CompanySettingsService;
import com.parkflow.modules.onboarding.application.service.FeatureAccessService;
import com.parkflow.modules.onboarding.application.service.OnboardingService;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.auth.domain.UserRole;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.parkflow.modules.configuration.service.OperationalConfigurationService;

class OnboardingServiceTest {

  private CompanyPort companyRepository;
  private OnboardingProgressPort onboardingProgressRepository;
  private CompanySettingsService companySettingsService;
  private com.parkflow.modules.onboarding.domain.repository.CompanySettingsSnapshotPort companySettingsSnapshotPort;
  private com.parkflow.modules.audit.service.AuditService auditService;
  private OperationalConfigurationService operationalConfigurationService;
  private OnboardingService onboardingService;

  private Company company;

  @BeforeEach
  void setup() {
    companyRepository = mock(CompanyPort.class);
    onboardingProgressRepository = mock(OnboardingProgressPort.class);
    companySettingsService = mock(CompanySettingsService.class);
    companySettingsSnapshotPort = mock(com.parkflow.modules.onboarding.domain.repository.CompanySettingsSnapshotPort.class);
    auditService = mock(com.parkflow.modules.audit.service.AuditService.class);
    operationalConfigurationService = mock(OperationalConfigurationService.class);
    onboardingService = new OnboardingService(
        companyRepository,
        onboardingProgressRepository,
        companySettingsService,
        new FeatureAccessService(),
        companySettingsSnapshotPort,
        auditService,
        operationalConfigurationService);

    company = new Company();
    company.setId(UUID.randomUUID());
    company.setPlan(PlanType.LOCAL);
    company.setOnboardingCompleted(false);

    when(companyRepository.findById(company.getId())).thenReturn(Optional.of(company));
    when(onboardingProgressRepository.save(any(OnboardingProgress.class))).thenAnswer(inv -> inv.getArgument(0));
    when(companyRepository.save(any(Company.class))).thenAnswer(inv -> inv.getArgument(0));

    AuthPrincipal principal = new AuthPrincipal(
        UUID.randomUUID(),
        company.getId(),
        "admin@test.com",
        UserRole.ADMIN.name(),
        java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(company.getId());
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void saveStep_persistsPartialProgress() {
    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(1);
    progress.setProgressData(new LinkedHashMap<>());
    when(onboardingProgressRepository.findByCompanyId(company.getId())).thenReturn(Optional.of(progress));

    OnboardingStatusResponse response = onboardingService.saveOnboardingStep(company.getId(), 1, Map.of("vehicleTypes", java.util.List.of("CARRO")));

    assertEquals(2, response.currentStep());
    assertTrue(response.progressData().containsKey("step_1"));
  }

  @Test
  void skip_appliesDefaultAndCompletes() {
    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(1);
    progress.setProgressData(new LinkedHashMap<>());
    when(onboardingProgressRepository.findByCompanyId(company.getId())).thenReturn(Optional.of(progress));

    onboardingService.skipAndApplyDefaults(company.getId());

    verify(companySettingsService, times(1)).upsertSettings(eq(company), anyMap());
    assertTrue(company.getOnboardingCompleted());
  }

  @Test
  void saveStep_filtersPaymentMethodsByPlan() {
    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(1);
    progress.setProgressData(new LinkedHashMap<>());
    when(onboardingProgressRepository.findByCompanyId(company.getId())).thenReturn(Optional.of(progress));

    OnboardingStatusResponse response = onboardingService.saveOnboardingStep(
        company.getId(),
        6,
        Map.of("paymentMethods", java.util.List.of("EFECTIVO", "NEQUI", "QR")));

    @SuppressWarnings("unchecked")
    Map<String, Object> stepData = (Map<String, Object>) response.progressData().get("step_6");
    @SuppressWarnings("unchecked")
    java.util.List<String> methods = (java.util.List<String>) stepData.get("paymentMethods");
    assertEquals(java.util.List.of("EFECTIVO"), methods);
  }

  @Test
  void resetOnboarding_savesSnapshotAndResetsProgress() {
    company.setOnboardingCompleted(true);
    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(12);
    progress.setCompleted(true);
    progress.setProgressData(Map.of("step_1", Map.of("vehicleTypes", java.util.List.of("MOTO"))));
    
    when(onboardingProgressRepository.findByCompanyId(company.getId())).thenReturn(Optional.of(progress));
    when(companySettingsSnapshotPort.countByCompanyId(company.getId())).thenReturn(0);
    when(companySettingsService.getSettingsOrDefault(company)).thenReturn(Map.of("vehicleTypes", java.util.List.of("MOTO")));

    OnboardingStatusResponse response = onboardingService.resetOnboarding(company.getId(), "Test Reset");

    assertFalse(company.getOnboardingCompleted());
    assertFalse(progress.isCompleted());
    assertEquals(1, progress.getCurrentStep());
    assertEquals(1, response.currentStep());
    assertFalse(response.onboardingCompleted());

    verify(companySettingsSnapshotPort, times(1)).save(any());
    verify(auditService, times(1)).record(any(), any(), anyString(), anyString(), anyString());
  }
}
