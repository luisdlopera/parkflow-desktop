package com.parkflow.modules.onboarding.application.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
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
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.application.service.SettingsVehicleTypeService;

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
  @Mock private com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort parkingSessionPort;
  @Mock private com.parkflow.modules.auth.domain.repository.AuthSessionPort authSessionPort;
  @Mock private com.parkflow.modules.parking.operation.repository.AppUserRepository appUserRepository;
  @Mock private com.parkflow.modules.parking.locker.service.LockerService lockerService;
  @Mock private com.parkflow.modules.parking.spaces.service.ParkingSpaceService parkingSpaceService;
  @Mock private com.parkflow.modules.parking.operation.repository.RateRepository rateRepository;
  @Mock private SettingsVehicleTypeService settingsVehicleTypeService;

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
        new OnboardingSettingsMapper(new FeatureAccessService()),
        parkingSessionPort,
        authSessionPort,
        appUserRepository,
        lockerService,
        parkingSpaceService,
        rateRepository,
        settingsVehicleTypeService
    );

    company = new Company();
    company.setId(companyId);
    company.setPlan(PlanType.LOCAL);
    company.setOnboardingCompleted(false);
    company.setOperationalProfile(OperationalProfile.MIXED);

    lenient().when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    lenient().when(onboardingProgressPort.save(any(OnboardingProgress.class))).thenAnswer(inv -> inv.getArgument(0));
    lenient().when(companyRepository.save(any(Company.class))).thenAnswer(inv -> inv.getArgument(0));
    lenient().when(settingsVehicleTypeService.addTypeToCompany(any(), anyString())).thenReturn(null);
  }

  @Test
  void saveStep_persistsPartialProgress() {
    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(1);
    progress.setProgressData(new LinkedHashMap<>());
    when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));

    OnboardingStatusResponse response = onboardingService.saveOnboardingStep(companyId, 1, Map.of("operationalProfile", "MIXED"), null);

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

  @Test
  void saveStep_rejectsMotorcycleWithoutHelmetHandling() {
    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(1);
    progress.setProgressData(new LinkedHashMap<>());
    when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));

    Map<String, Object> data = Map.of(
        "vehicleTypes", java.util.List.of("MOTORCYCLE"),
        "operationalProfile", "MOTORCYCLE_ONLY");

    assertThrows(OperationException.class, () -> onboardingService.saveOnboardingStep(companyId, 1, data, null));
  }

  @Test
  void saveStep_rejectsTokensWithoutTokenCount() {
    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(1);
    progress.setProgressData(new LinkedHashMap<>());
    when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));

    Map<String, Object> data = Map.of(
        "vehicleTypes", java.util.List.of("MOTORCYCLE"),
        "operationalProfile", "MOTORCYCLE_ONLY",
        "helmetHandling", "LOCKERS");

    assertThrows(OperationException.class, () -> onboardingService.saveOnboardingStep(companyId, 1, data, null));
  }

  @Test
  void saveStep_acceptsMotorcycleWithLockersAndCount() {
    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(1);
    progress.setProgressData(new LinkedHashMap<>());
    when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));

    Map<String, Object> data = new LinkedHashMap<>();
    data.put("vehicleTypes", java.util.List.of("MOTORCYCLE"));
    data.put("operationalProfile", "MOTORCYCLE_ONLY");
    data.put("helmetHandling", "LOCKERS");
    data.put("helmetTokenCount", 25);

    OnboardingStatusResponse response = onboardingService.saveOnboardingStep(companyId, 1, data, null);

    assertEquals(2, response.currentStep());
    @SuppressWarnings("unchecked")
    Map<String, Object> step1 = (Map<String, Object>) response.progressData().get("step_1");
    assertNotNull(step1);
    assertEquals("LOCKERS", step1.get("helmetHandling"));
    assertEquals(25, step1.get("helmetTokenCount"));
  }

  @Test
  void completeOnboarding_usesLockerConfigFromStep1() {
    OnboardingProgress progress = new OnboardingProgress();
    progress.setCompany(company);
    progress.setCurrentStep(12);
    progress.setCompleted(false);
    Map<String, Object> progressData = new LinkedHashMap<>();
    progressData.put("step_1", Map.of(
        "vehicleTypes", java.util.List.of("MOTORCYCLE"),
        "operationalProfile", "MOTORCYCLE_ONLY",
        "helmetHandling", "LOCKERS",
        "helmetTokenCount", 30));
    progressData.put("step_2", Map.of("totalCapacity", 50));
    progressData.put("step_3", Map.of("baseValue", 2000));
    progressData.put("step_4", Map.of("countryCode", "CO"));
    progressData.put("step_6", Map.of("paymentMethods", java.util.List.of("EFECTIVO")));
    progress.setProgressData(progressData);
    when(onboardingProgressPort.findByCompanyId(companyId)).thenReturn(Optional.of(progress));

    onboardingService.completeOnboarding(companyId);

    verify(companySettingsService, times(1)).upsertSettings(eq(company), argThat(settings -> {
      @SuppressWarnings("unchecked")
      Map<String, Object> operationConfiguration = (Map<String, Object>) settings.get("operationConfiguration");
      return Boolean.TRUE.equals(operationConfiguration.get("enableCustodiedItem"))
          && Boolean.TRUE.equals(operationConfiguration.get("usesHelmetTokens"))
          && Integer.valueOf(30).equals(operationConfiguration.get("helmetTokenCount"));
    }));
    verify(lockerService, times(1)).createBatch(eq(companyId), argThat(req ->
        "L-".equals(req.prefix()) && req.start() == 1 && req.end() == 30));
    verify(parkingSpaceService, times(1)).resizeCapacity(companyId, 50);
    assertTrue(company.getOnboardingCompleted());
  }
}
