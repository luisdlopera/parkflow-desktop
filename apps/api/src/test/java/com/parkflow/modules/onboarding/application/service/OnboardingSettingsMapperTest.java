package com.parkflow.modules.onboarding.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.enums.PlanType;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class OnboardingSettingsMapperTest {

  @Mock private FeatureAccessService featureAccessService;
  private OnboardingSettingsMapper mapper;

  @BeforeEach
  void setUp() {
    mapper = new OnboardingSettingsMapper(featureAccessService);
  }

  private Company company(PlanType plan) {
    Company c = new Company();
    c.setPlan(plan);
    return c;
  }

  @Test
//   @SuppressWarnings("unchecked")
  void buildSettingsFromProgress_emptyReturnsDefault() {
    Map<String, Object> settings = mapper.buildSettingsFromProgress(company(PlanType.LOCAL), Map.of());
    assertThat(settings).containsKey("rates");
    assertThat(settings).containsKey("capacity");
  }

  @Test
  @SuppressWarnings("unchecked")
  void buildSettingsFromProgress_richDataMapsAllSections() {
    Map<String, Object> progress = new LinkedHashMap<>();
    progress.put("step_1", Map.of(
        "operationalProfile", "MIXED",
        "vehicleTypes", List.of("MOTO", "CARRO")));
    progress.put("step_2", Map.of("controlSlots", true, "totalCapacity", 50,
        "capacityByType", Map.of("CAR", 30)));
    progress.put("step_3", Map.of("billingModel", "HOURLY", "baseValue", 2000,
        "hasNightRate", true, "hasFractions", true, "hasCourtesy", true,
        "graceMinutes", 10, "enableRateByType", true));
    progress.put("step_4", Map.of("countryCode", "CO", "platePattern", "ABC123"));
    progress.put("step_5", Map.of("enabled", true, "dayShiftStart", "07:00"));
    progress.put("step_6", Map.of("paymentMethods", List.of("EFECTIVO", "TARJETA")));
    progress.put("step_7", Map.of("allowReprint", true, "printerType", "THERMAL"));
    progress.put("step_8", Map.of());
    progress.put("step_9", Map.of("enabled", true, "agreementDiscount", 15));
    progress.put("step_10", Map.of("multiSite", true, "siteName1", "Norte", "siteName2", "Sur"));
    progress.put("step_11", Map.of("advanced", true));

    Map<String, Object> settings = mapper.buildSettingsFromProgress(company(PlanType.PRO), progress);

    assertThat(settings.get("plan")).isEqualTo("PRO");
    assertThat((List<?>) settings.get("vehicleTypes")).isNotEmpty();
    assertThat((List<?>) settings.get("sites")).hasSize(2);
    Map<String, Object> rates = (Map<String, Object>) settings.get("rates");
    assertThat(rates.get("hasNightRate")).isEqualTo(true);
    Map<String, Object> shifts = (Map<String, Object>) settings.get("shifts");
    assertThat(shifts.get("enabled")).isEqualTo(true);
    Map<String, Object> tickets = (Map<String, Object>) settings.get("tickets");
    assertThat(tickets.get("thermalPrinter")).isEqualTo(true);
  }

  @Test
  void buildSettingsFromProgress_motorcycleOnly() {
    Map<String, Object> progress = new LinkedHashMap<>();
    progress.put("step_1", Map.of("operationalProfile", "MOTORCYCLE_ONLY"));
    Map<String, Object> settings = mapper.buildSettingsFromProgress(company(PlanType.LOCAL), progress);
    assertThat((List<String>)(List<?>) settings.get("vehicleTypes")).containsExactly("MOTORCYCLE");
  }

  @Test
  void buildSettingsFromProgress_carOnly() {
    Map<String, Object> progress = new LinkedHashMap<>();
    progress.put("step_1", Map.of("operationalProfile", "CAR_ONLY"));
    Map<String, Object> settings = mapper.buildSettingsFromProgress(company(PlanType.LOCAL), progress);
    assertThat((List<String>)(List<?>) settings.get("vehicleTypes")).containsExactly("CAR");
  }

  @Test
  void defaultConfiguration_hasExpectedKeys() {
    Map<String, Object> cfg = mapper.defaultConfiguration(company(PlanType.LOCAL));
    assertThat(cfg).containsKeys("capacity", "rates");
  }

  @Test
  void sanitizeStepDataByPlan_filtersPaymentMethods() {
    when(featureAccessService.getAvailableOptionsByPlan(PlanType.LOCAL))
        .thenReturn(Map.of("paymentMethods", List.of("EFECTIVO")));
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("paymentMethods", List.of("EFECTIVO", "TARJETA"));
    Map<String, Object> out = mapper.sanitizeStepDataByPlan(company(PlanType.LOCAL), 6, data);
    assertThat((List<String>)(List<?>) out.get("paymentMethods")).doesNotContain("TARJETA");
  }

  @Test
  void sanitizeStepDataByPlan_disablesAgreementsWhenNotAllowed() {
    when(featureAccessService.getAvailableOptionsByPlan(PlanType.LOCAL))
        .thenReturn(Map.of("allowAgreementsAndMonthly", false));
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("enabled", true);
    Map<String, Object> out = mapper.sanitizeStepDataByPlan(company(PlanType.LOCAL), 9, data);
    assertThat(out.get("enabled")).isEqualTo(false);
  }

  @Test
  void sanitizeStepDataByPlan_disablesMultiSite() {
    when(featureAccessService.getAvailableOptionsByPlan(PlanType.LOCAL))
        .thenReturn(Map.of("allowMultiLocation", false));
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("multiSite", true);
    Map<String, Object> out = mapper.sanitizeStepDataByPlan(company(PlanType.LOCAL), 10, data);
    assertThat(out.get("multiSite")).isEqualTo(false);
  }

  @Test
  void sanitizeStepDataByPlan_disablesAdvancedPermissions() {
    when(featureAccessService.getAvailableOptionsByPlan(PlanType.LOCAL))
        .thenReturn(Map.of("allowAdvancedPermissions", false));
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("advanced", true);
    Map<String, Object> out = mapper.sanitizeStepDataByPlan(company(PlanType.LOCAL), 11, data);
    assertThat(out.get("advanced")).isEqualTo(false);
  }
}
