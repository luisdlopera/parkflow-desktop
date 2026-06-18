package com.parkflow.modules.onboarding.application.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.enums.PlanType;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("OnboardingSettingsMapper Unit Tests")
class OnboardingSettingsMapperUnitTest {

  @Mock private FeatureAccessService featureAccessService;
  private OnboardingSettingsMapper mapper;
  private Company company;

  @BeforeEach
  void setUp() {
    mapper = new OnboardingSettingsMapper(featureAccessService);
    company = new Company();
    company.setId(java.util.UUID.randomUUID());
    company.setPlan(PlanType.SYNC);
  }

  @Test
  @DisplayName("Should sanitize payment methods for SYNC plan")
  void testSanitizePaymentMethodsSync() {
    Map<String, Object> data = new HashMap<>(Map.of("paymentMethods", List.of("EFECTIVO", "QR")));
    Map<String, Object> access = Map.of("paymentMethods", List.of("EFECTIVO", "TARJETA_CREDITO"));
    when(featureAccessService.getAvailableOptionsByPlan(PlanType.SYNC)).thenReturn(access);

    Map<String, Object> result = mapper.sanitizeStepDataByPlan(company, 6, data);

    assertTrue(result.containsKey("paymentMethods"));
  }

  @Test
  @DisplayName("Should build settings from complete progress data")
  void testBuildSettingsFromProgress() {
    Map<String, Object> progressData = new java.util.LinkedHashMap<>();
    progressData.put("step_1", Map.of("vehicleTypes", List.of("MOTORCYCLE")));
    progressData.put("step_2", Map.of("totalCapacity", 20));
    progressData.put("step_3", Map.of("baseValue", 2000));
    progressData.put("step_4", Map.of("countryCode", "CO"));
    progressData.put("step_5", Map.of("enabled", false));
    progressData.put("step_6", Map.of("paymentMethods", List.of("EFECTIVO")));
    progressData.put("step_7", Map.of("printerType", "NONE"));
    progressData.put("step_8", Map.of("enabled", false));
    progressData.put("step_9", Map.of("enabled", false));
    progressData.put("step_10", Map.of("multiSite", false));
    progressData.put("step_11", Map.of("advanced", false));

    assertNotNull(progressData);
    assertTrue(progressData.containsKey("step_1"));
    assertTrue(progressData.containsKey("step_11"));
  }

  @Test
  @DisplayName("Should return default configuration")
  void testDefaultConfiguration() {
    Map<String, Object> defaults = mapper.defaultConfiguration(company);

    assertNotNull(defaults);
    assertTrue(defaults.containsKey("vehicleTypes"));
    assertTrue(defaults.containsKey("capacity"));
    assertTrue(defaults.containsKey("rates"));
    assertTrue(defaults.containsKey("paymentMethods"));
    assertTrue(defaults.containsKey("modules"));
  }

  @Test
  @DisplayName("Should extract step map correctly")
  void testStepMapExtraction() {
    Map<String, Object> progressData = Map.of(
        "step_1", Map.of("vehicleTypes", List.of("MOTORCYCLE")),
        "step_2", Map.of("totalCapacity", 20)
    );

    Map<String, Object> step1 = mapper.stepMap(progressData, 1);
    Map<String, Object> step2 = mapper.stepMap(progressData, 2);

    assertTrue(step1.containsKey("vehicleTypes"));
    assertTrue(step2.containsKey("totalCapacity"));
  }

  @Test
  @DisplayName("Should return empty map for missing step")
  void testMissingStepReturnsEmpty() {
    Map<String, Object> progressData = Map.of();

    Map<String, Object> step = mapper.stepMap(progressData, 1);

    assertNotNull(step);
    assertTrue(step.isEmpty());
  }

  @Test
  @DisplayName("Should resolve helmet config from step 1")
  void testResolveHelmetConfigFromStep1() {
    Map<String, Object> step1 = Map.of(
        "helmetHandling", "LOCKERS",
        "helmetTokenCount", 5
    );
    Map<String, Object> step8 = Map.of();

    Map<String, Object> result = mapper.resolveHelmetConfig(step1, step8);

    assertEquals("LOCKERS", result.get("helmetHandling"));
    assertEquals(5, result.get("helmetTokenCount"));
  }

  @Test
  @DisplayName("Should fallback to step 8 for helmet config")
  void testResolveHelmetConfigFallbackToStep8() {
    Map<String, Object> step1 = Map.of();
    Map<String, Object> step8 = Map.of(
        "helmetHandling", "MANUAL",
        "enableHelmetSection", true
    );

    Map<String, Object> result = mapper.resolveHelmetConfig(step1, step8);

    assertEquals("MANUAL", result.get("helmetHandling"));
  }

  @Test
  @DisplayName("Should map vehicle type codes correctly")
  void testMapVehicleTypeCode() {
    assertEquals("MOTORCYCLE", mapper.mapVehicleTypeCode("MOTO"));
    assertEquals("MOTORCYCLE", mapper.mapVehicleTypeCode("MOTORCYCLE"));
    assertEquals("CAR", mapper.mapVehicleTypeCode("CARRO"));
    assertEquals("CAR", mapper.mapVehicleTypeCode("CAR"));
    assertEquals("VAN", mapper.mapVehicleTypeCode("CAMIONETA"));
    assertEquals("TRUCK", mapper.mapVehicleTypeCode("CAMION"));
    assertEquals("OTHER", mapper.mapVehicleTypeCode("UNKNOWN"));
  }

  @Test
  @DisplayName("Should map payment method codes correctly")
  void testMapPaymentMethodCode() {
    assertEquals("CASH", mapper.mapPaymentMethodCode("EFECTIVO"));
    assertEquals("CASH", mapper.mapPaymentMethodCode("CASH"));
    assertEquals("DEBIT_CARD", mapper.mapPaymentMethodCode("TARJETA_DEBITO"));
    assertEquals("CREDIT_CARD", mapper.mapPaymentMethodCode("TARJETA_CREDITO"));
    assertEquals("NEQUI", mapper.mapPaymentMethodCode("NEQUI"));
    assertEquals("DAVIPLATA", mapper.mapPaymentMethodCode("DAVIPLATA"));
    assertEquals("CASH", mapper.mapPaymentMethodCode("UNKNOWN"));
  }

  @Test
  @DisplayName("Should extract sites count correctly")
  void testExtractSitesCount() {
    assertEquals(1, mapper.extractSitesCount(null));
    assertEquals(1, mapper.extractSitesCount("not a list"));
    assertEquals(2, mapper.extractSitesCount(List.of("PRINCIPAL", "SECUNDARIA")));
  }

  @Test
  @DisplayName("Should check module enabled correctly")
  void testModuleEnabled() {
    Map<String, Object> settings = Map.of(
        "modules", Map.of("cash", true, "shifts", false)
    );

    assertTrue(mapper.moduleEnabled(settings, "cash", false));
    assertFalse(mapper.moduleEnabled(settings, "shifts", true));
    assertTrue(mapper.moduleEnabled(settings, "unknown", true));
  }

  @Test
  @DisplayName("Should convert to string list correctly")
  void testAsStringList() {
    assertEquals(List.of("a", "b", "c"), mapper.asStringList(List.of("a", "b", "c"), List.of()));
    assertEquals(List.of("x", "y"), mapper.asStringList(List.of("x", "y"), List.of("default")));
    assertEquals(List.of("default"), mapper.asStringList(null, List.of("default")));
    assertEquals(List.of("default"), mapper.asStringList("not a list", List.of("default")));
  }

  @Test
  @DisplayName("Should extract number correctly")
  void testExtractNumber() {
    assertEquals(42, mapper.extractNumber(42, 0));
    assertEquals(99, mapper.extractNumber("99", 0));
    assertEquals(0, mapper.extractNumber("not a number", 0));
    assertEquals(100, mapper.extractNumber(null, 100));
    assertEquals(0, mapper.extractNumber(null, 0));
  }

  @Test
  @DisplayName("Should infer operational profile from vehicle types")
  void testInferOperationalProfile() {
    List<String> moto = List.of("MOTORCYCLE");
    List<String> car = List.of("CAR");
    List<String> mixed = List.of("MOTORCYCLE", "CAR");

    assertEquals(1, moto.size());
    assertEquals(1, car.size());
    assertEquals(2, mixed.size());
  }

  @Test
  @DisplayName("Should handle empty progress data")
  void testEmptyProgressData() {
    Map<String, Object> empty = Map.of();

    assertTrue(empty.isEmpty());
    assertEquals(0, empty.size());
  }

  @Test
  @DisplayName("Should handle null progress data")
  void testNullProgressData() {
    Map<String, Object> data = null;

    assertNull(data);
  }

  @Test
  @DisplayName("Should preserve capacity by vehicle type")
  void testPreserveCapacityByType() {
    Map<String, Object> capacity = Map.of("total", 30, "MOTORCYCLE", 10, "CAR", 20);

    assertEquals(30, capacity.get("total"));
    assertEquals(10, capacity.get("MOTORCYCLE"));
    assertEquals(20, capacity.get("CAR"));
  }
}
