package com.parkflow.modules.onboarding.application.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

import com.parkflow.modules.licensing.domain.repository.CompanyModulePort;
import com.parkflow.modules.licensing.enums.PlanType;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("FeatureAccessService Unit Tests")
class FeatureAccessServiceUnitTest {

  private FeatureAccessService service;

  @BeforeEach
  void setUp() {
    service = new FeatureAccessService(mock(CompanyModulePort.class));
  }

  @Test
  @DisplayName("Should provide options for LOCAL plan")
  void testLocalPlanOptions() {
    Map<String, Object> options = service.getAvailableOptionsByPlan(PlanType.LOCAL);

    assertNotNull(options);
    assertFalse((Boolean) options.get("allowMultiLocation"));
    assertFalse((Boolean) options.get("allowAdvancedPermissions"));
    assertFalse((Boolean) options.get("allowPremiumPayments"));
  }

  @Test
  @DisplayName("Should provide options for SYNC plan")
  void testSyncPlanOptions() {
    Map<String, Object> options = service.getAvailableOptionsByPlan(PlanType.SYNC);

    assertNotNull(options);
    assertFalse((Boolean) options.get("allowMultiLocation"));
    assertTrue((Boolean) options.get("allowPremiumPayments"));
    assertTrue((List<?>) options.get("paymentMethods") != null);
  }

  @Test
  @DisplayName("Should provide options for PRO plan")
  void testProPlanOptions() {
    Map<String, Object> options = service.getAvailableOptionsByPlan(PlanType.PRO);

    assertNotNull(options);
    assertTrue((Boolean) options.get("allowMultiLocation"));
    assertTrue((Boolean) options.get("allowAdvancedPermissions"));
    assertTrue((Boolean) options.get("allowAgreementsAndMonthly"));
  }

  @Test
  @DisplayName("Should provide options for ENTERPRISE plan")
  void testEnterprisePlanOptions() {
    Map<String, Object> options = service.getAvailableOptionsByPlan(PlanType.ENTERPRISE);

    assertNotNull(options);
    assertTrue((Boolean) options.get("allowMultiLocation"));
    assertTrue((Boolean) options.get("allowAdvancedPermissions"));
    assertTrue((Boolean) options.get("allowAdvancedAudit"));
    assertTrue((Boolean) options.get("allowAgreementsAndMonthly"));
  }

  @Test
  @DisplayName("Should return vehicle types for all plans")
  void testVehicleTypesAvailable() {
    for (PlanType plan : PlanType.values()) {
      Map<String, Object> options = service.getAvailableOptionsByPlan(plan);
      List<?> types = (List<?>) options.get("vehicleTypes");
      assertNotNull(types);
      assertTrue(types.size() > 0);
    }
  }

  @Test
  @DisplayName("Should return payment methods for SYNC plan")
  void testPaymentMethodsSync() {
    Map<String, Object> options = service.getAvailableOptionsByPlan(PlanType.SYNC);
    List<?> methods = (List<?>) options.get("paymentMethods");

    assertNotNull(methods);
    assertTrue(methods.contains("CASH"));
    assertTrue(methods.contains("CREDIT_CARD"));
  }

  @Test
  @DisplayName("Should return only CASH for LOCAL plan")
  void testPaymentMethodsLocal() {
    Map<String, Object> options = service.getAvailableOptionsByPlan(PlanType.LOCAL);
    List<?> methods = (List<?>) options.get("paymentMethods");

    assertNotNull(methods);
    assertEquals(1, methods.size());
    assertEquals("CASH", methods.get(0));
  }

  @Test
  @DisplayName("Should check feature enabled in settings")
  void testIsFeatureEnabled() {
    Map<String, Object> settings = Map.of("modules", Map.of("cash", true, "shifts", false));

    assertTrue(service.isFeatureEnabled(settings, "cash"));
    assertFalse(service.isFeatureEnabled(settings, "shifts"));
  }

  @Test
  @DisplayName("Should return false for missing feature")
  void testMissingFeatureReturnsFalse() {
    Map<String, Object> settings = Map.of("modules", Map.of("cash", true));

    assertFalse(service.isFeatureEnabled(settings, "unknown_feature"));
  }

  @Test
  @DisplayName("Should return false if modules key missing")
  void testMissingModulesKey() {
    Map<String, Object> settings = Map.of("other", "data");

    assertFalse(service.isFeatureEnabled(settings, "cash"));
  }

  @Test
  @DisplayName("Should return false if feature value is not boolean")
  void testNonBooleanFeatureValue() {
    Map<String, Object> settings = Map.of("modules", Map.of("cash", "true"));

    assertFalse(service.isFeatureEnabled(settings, "cash"));
  }

  @Test
  @DisplayName("Should return false if settings is null")
  void testNullSettings() {
    Map<String, Object> settings = Map.of("modules", Map.of());
    boolean result = service.isFeatureEnabled(settings, "cash");

    assertFalse(result);
  }

  @Test
  @DisplayName("PRO plan has more features than SYNC")
  void testProHasMoreFeaturesThanSync() {
    Map<String, Object> sync = service.getAvailableOptionsByPlan(PlanType.SYNC);
    Map<String, Object> pro = service.getAvailableOptionsByPlan(PlanType.PRO);

    assertFalse((Boolean) sync.get("allowMultiLocation"));
    assertTrue((Boolean) pro.get("allowMultiLocation"));
  }

  @Test
  @DisplayName("ENTERPRISE has all features")
  void testEnterpriseHasAllFeatures() {
    Map<String, Object> options = service.getAvailableOptionsByPlan(PlanType.ENTERPRISE);

    for (Object plan : new PlanType[]{PlanType.SYNC, PlanType.PRO}) {
      Map<String, Object> planOptions = service.getAvailableOptionsByPlan((PlanType) plan);
      for (String key : planOptions.keySet()) {
        if (key.startsWith("allow")) {
          assertTrue(
              (Boolean) options.get(key),
              "ENTERPRISE should have feature: " + key
          );
        }
      }
    }
  }

  @Test
  @DisplayName("Should handle empty modules map")
  void testEmptyModulesMap() {
    Map<String, Object> settings = Map.of("modules", Map.of());

    assertFalse(service.isFeatureEnabled(settings, "cash"));
  }
}
