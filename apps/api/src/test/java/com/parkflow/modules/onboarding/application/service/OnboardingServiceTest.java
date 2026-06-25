package com.parkflow.modules.onboarding.application.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import com.parkflow.modules.configuration.application.service.OperationalConfigurationService;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.onboarding.domain.OnboardingProgress;
import com.parkflow.modules.onboarding.domain.repository.CompanySettingsSnapshotPort;
import com.parkflow.modules.onboarding.domain.repository.OnboardingProgressPort;
import com.parkflow.modules.onboarding.dto.CompanyCapabilitiesResponse;
import com.parkflow.modules.onboarding.dto.OnboardingQuestionConfigDto;
import com.parkflow.modules.onboarding.dto.OnboardingStatusResponse;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@DisplayName("OnboardingService Real Unit Tests")
class OnboardingServiceTest {

  @Mock private CompanyPort companyRepository;
  @Mock private OnboardingProgressPort onboardingProgressPort;
  @Mock private CompanySettingsService companySettingsService;
  @Mock private FeatureAccessService featureAccessService;
  @Mock private CompanySettingsSnapshotPort companySettingsSnapshotPort;
  @Mock private AuditPort auditService;
  @Mock private OperationalConfigurationService operationalConfigurationService;
  @Mock private OnboardingQuestionConfigService onboardingQuestionConfigService;
  @Mock private OnboardingSettingsMapper settingsMapper;
  @Mock private ParkingSessionPort parkingSessionPort;
  @Mock private AuthSessionPort authSessionPort;
  @Mock private AppUserRepository appUserRepository;
  @Mock private OnboardingMaterializationService materializationService;

  @InjectMocks
  private OnboardingService onboardingService;

  private Company company;
  private UUID companyId;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    company = new Company();
    company.setId(companyId);
    company.setPlan(PlanType.PRO);
  }

  @Test
  void status_ShouldReturnStatus() {
    try (MockedStatic<com.parkflow.modules.auth.security.SecurityUtils> securityUtils = mockStatic(com.parkflow.modules.auth.security.SecurityUtils.class)) {
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireCompanyId).thenReturn(companyId);
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireUserRole).thenReturn(com.parkflow.modules.auth.domain.UserRole.ADMIN);

      when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));

      OnboardingProgress progress = new OnboardingProgress();
      progress.setCurrentStep(2);
      progress.setSkipped(false);
      progress.setProgressData(new LinkedHashMap<>());
      when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));

      when(onboardingQuestionConfigService.findAllEnabled()).thenReturn(List.of(
          new OnboardingQuestionConfigDto(UUID.randomUUID(), 1, "Title", "Desc", true, false, false),
          new OnboardingQuestionConfigDto(UUID.randomUUID(), 2, "Title", "Desc", true, false, false)
      ));
      
      when(featureAccessService.getAvailableOptionsByPlan(company.getPlan()))
          .thenReturn(Map.of("allowMultiLocation", true));

      OnboardingStatusResponse response = onboardingService.status(companyId);

      assertNotNull(response);
      assertEquals(companyId, response.companyId());
      assertEquals(2, response.currentStep());
      assertFalse(response.skipped());
      assertTrue(response.enabledSteps().contains(1));
    }
  }

  @Test
  void saveOnboardingStep_ShouldSaveAndReturnStatus() {
    try (MockedStatic<com.parkflow.modules.auth.security.SecurityUtils> securityUtils = mockStatic(com.parkflow.modules.auth.security.SecurityUtils.class)) {
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireCompanyId).thenReturn(companyId);
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireUserRole).thenReturn(com.parkflow.modules.auth.domain.UserRole.ADMIN);

      when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));

      OnboardingProgress progress = new OnboardingProgress();
      progress.setCurrentStep(1);
      progress.setProgressData(new LinkedHashMap<>());
      when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));

      Map<String, Object> data = Map.of("vehicleTypes", List.of("CAR"));
      when(settingsMapper.sanitizeStepDataByPlan(eq(company), eq(1), eq(data))).thenReturn(data);

      OnboardingStatusResponse response = onboardingService.saveOnboardingStep(companyId, 1, data, 2);

      assertNotNull(response);
      verify(onboardingProgressPort).save(any(OnboardingProgress.class));
      assertEquals(2, progress.getCurrentStep());
    }
  }

  @Test
  void completeOnboarding_ShouldSaveSettingsAndReturnStatus() {
    try (MockedStatic<com.parkflow.modules.auth.security.SecurityUtils> securityUtils = mockStatic(com.parkflow.modules.auth.security.SecurityUtils.class)) {
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireCompanyId).thenReturn(companyId);
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireUserRole).thenReturn(com.parkflow.modules.auth.domain.UserRole.ADMIN);

      when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));

      OnboardingProgress progress = new OnboardingProgress();
      progress.setCurrentStep(12);
      progress.setProgressData(new LinkedHashMap<>());
      when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));

      when(settingsMapper.stepMap(anyMap(), eq(2))).thenReturn(Map.of("totalCapacity", 100));
      when(settingsMapper.stepMap(anyMap(), eq(1))).thenReturn(Map.of("operationalProfile", "MIXED"));
      when(settingsMapper.buildSettingsFromProgress(eq(company), anyMap())).thenReturn(Map.of("vehicleTypes", List.of("CAR")));
      when(settingsMapper.extractNumber(any(), anyInt())).thenReturn(100);

      OnboardingStatusResponse response = onboardingService.completeOnboarding(companyId);

      assertNotNull(response);
      assertTrue(company.getOnboardingCompleted());
      verify(companySettingsService).upsertSettings(eq(company), anyMap());
      verify(materializationService).resizeCapacity(companyId, 100);
      verify(companyRepository).save(company);
    }
  }

  @Test
  void getCapabilities_ShouldReturnMappedCapabilities() {
    try (MockedStatic<com.parkflow.modules.auth.security.SecurityUtils> securityUtils = mockStatic(com.parkflow.modules.auth.security.SecurityUtils.class)) {
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireCompanyId).thenReturn(companyId);
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireUserRole).thenReturn(com.parkflow.modules.auth.domain.UserRole.ADMIN);

      company.setOnboardingCompleted(true);
      when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));

      when(featureAccessService.getAvailableOptionsByPlan(company.getPlan())).thenReturn(Map.of("allowMultiLocation", true));
      Map<String, Object> settings = Map.of("sites", List.of(Map.of("id", "S1")));
      when(companySettingsService.getSettingsOrDefault(company)).thenReturn(settings);

      when(settingsMapper.asStringList(any(), anyList())).thenReturn(List.of("CARRO"));
      when(settingsMapper.mapVehicleTypeCode(anyString())).thenReturn("CAR");
      when(settingsMapper.mapPaymentMethodCode(anyString())).thenReturn("CASH");
      when(settingsMapper.extractSitesCount(any())).thenReturn(1);
      when(settingsMapper.moduleEnabled(eq(settings), eq("cash"), anyBoolean())).thenReturn(true);
      when(settingsMapper.moduleEnabled(eq(settings), eq("shifts"), anyBoolean())).thenReturn(false);
      when(settingsMapper.moduleEnabled(eq(settings), eq("clients"), anyBoolean())).thenReturn(false);
      when(settingsMapper.moduleEnabled(eq(settings), eq("agreements"), anyBoolean())).thenReturn(false);

      CompanyCapabilitiesResponse response = onboardingService.getCapabilities(companyId);

      assertNotNull(response);
      assertTrue(response.onboardingCompleted());
      assertTrue(response.allowMultiLocation());
      assertTrue(response.cashEnabled());
      assertEquals(1, response.activeSites());
    }
  }

  @Test
  void resetOnboarding_ShouldSnapshotAndReset() {
    try (MockedStatic<com.parkflow.modules.auth.security.SecurityUtils> securityUtils = mockStatic(com.parkflow.modules.auth.security.SecurityUtils.class)) {
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireCompanyId).thenReturn(companyId);
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireUserRole).thenReturn(com.parkflow.modules.auth.domain.UserRole.SUPER_ADMIN);

      when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
      when(parkingSessionPort.countActive(companyId)).thenReturn(5L);

      OnboardingProgress progress = new OnboardingProgress();
      progress.setCurrentStep(12);
      progress.setProgressData(new LinkedHashMap<>());
      when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));

      when(companySettingsService.getSettingsOrDefault(company)).thenReturn(Map.of());
      when(companySettingsSnapshotPort.countByCompanyId(companyId)).thenReturn(1);

      com.parkflow.modules.auth.domain.AppUser user = new com.parkflow.modules.auth.domain.AppUser();
      user.setEmail("admin@test.com");
      Authentication auth = mock(Authentication.class);
      when(auth.getPrincipal()).thenReturn(user);
      SecurityContext securityContext = mock(SecurityContext.class);
      when(securityContext.getAuthentication()).thenReturn(auth);
      SecurityContextHolder.setContext(securityContext);

      when(appUserRepository.findByCompanyId(companyId)).thenReturn(List.of(user));

      OnboardingStatusResponse response = onboardingService.resetOnboarding(companyId, "Reorganización");

      assertNotNull(response);
      verify(companySettingsSnapshotPort).save(any());
      assertFalse(company.getOnboardingCompleted());
      assertEquals(1, progress.getCurrentStep());
      verify(auditService).record(any(), eq(companyId), eq(user), anyString(), anyString(), anyString());
    } finally {
      SecurityContextHolder.clearContext();
    }
  }

  @Test
  void skipAndApplyDefaults_WithProgress() {
    try (MockedStatic<com.parkflow.modules.auth.security.SecurityUtils> securityUtils = mockStatic(com.parkflow.modules.auth.security.SecurityUtils.class)) {
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireCompanyId).thenReturn(companyId);
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireUserRole).thenReturn(com.parkflow.modules.auth.domain.UserRole.ADMIN);

      when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
      OnboardingProgress progress = new OnboardingProgress();
      progress.setProgressData(Map.of("step1", Map.of("key", "value")));
      when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));
      
      when(settingsMapper.buildSettingsFromProgress(eq(company), anyMap())).thenReturn(Map.of("vehicleTypes", List.of("CAR")));
      when(settingsMapper.stepMap(anyMap(), eq(1))).thenReturn(Map.of("operationalProfile", "MIXED"));
      
      onboardingService.skipAndApplyDefaults(companyId);
      
      assertTrue(progress.isSkipped());
      assertTrue(progress.isCompleted());
      verify(materializationService).createLockersIfConfigured(eq(companyId), anyMap());
      verify(materializationService).createRatesFromOnboarding(eq(company), anyMap());
    }
  }

  @Test
  void skipAndApplyDefaults_WithoutProgress() {
    try (MockedStatic<com.parkflow.modules.auth.security.SecurityUtils> securityUtils = mockStatic(com.parkflow.modules.auth.security.SecurityUtils.class)) {
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireCompanyId).thenReturn(companyId);
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireUserRole).thenReturn(com.parkflow.modules.auth.domain.UserRole.ADMIN);

      when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
      OnboardingProgress progress = new OnboardingProgress();
      progress.setProgressData(null);
      when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));
      
      when(settingsMapper.defaultConfiguration(company)).thenReturn(Map.of("vehicleTypes", List.of("CAR")));
      when(settingsMapper.stepMap(anyMap(), eq(1))).thenReturn(Map.of());
      
      onboardingService.skipAndApplyDefaults(companyId);
      
      assertTrue(progress.isSkipped());
      assertTrue(progress.isCompleted());
      verify(materializationService).createDefaultRates(company);
    }
  }

  @Test
  void getCompanySettings_ReturnsMappedSettings() {
    try (MockedStatic<com.parkflow.modules.auth.security.SecurityUtils> securityUtils = mockStatic(com.parkflow.modules.auth.security.SecurityUtils.class)) {
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireCompanyId).thenReturn(companyId);
      securityUtils.when(com.parkflow.modules.auth.security.SecurityUtils::requireUserRole).thenReturn(com.parkflow.modules.auth.domain.UserRole.ADMIN);

      when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
      when(companySettingsService.getSettingsOrDefault(company)).thenReturn(Map.of("key", "val"));

      Map<String, Object> response = onboardingService.getCompanySettings(companyId);
      assertEquals("val", response.get("key"));
    }
  }

}