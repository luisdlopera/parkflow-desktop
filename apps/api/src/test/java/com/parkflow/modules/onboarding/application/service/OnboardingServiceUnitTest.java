package com.parkflow.modules.onboarding.application.service;

import static org.junit.jupiter.api.Assertions.*;

import com.parkflow.modules.licensing.enums.PlanType;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("OnboardingService Unit Tests")
class OnboardingServiceUnitTest {

  private FeatureAccessService featureAccessService = new FeatureAccessService();

  @Test
  @DisplayName("Should provide SYNC plan options")
  void testSyncPlanOptions() {
    Map<String, Object> options = featureAccessService.getAvailableOptionsByPlan(PlanType.SYNC);

    assertNotNull(options);
    assertFalse((Boolean) options.get("allowMultiLocation"));
  }

  @Test
  @DisplayName("Should provide PRO plan with multi location")
  void testProPlanMultiLocation() {
    Map<String, Object> options = featureAccessService.getAvailableOptionsByPlan(PlanType.PRO);

    assertTrue((Boolean) options.get("allowMultiLocation"));
    assertTrue((Boolean) options.get("allowAdvancedPermissions"));
  }

  @Test
  @DisplayName("Should provide ENTERPRISE all features")
  void testEnterpriseAllFeatures() {
    Map<String, Object> options = featureAccessService.getAvailableOptionsByPlan(PlanType.ENTERPRISE);

    assertTrue((Boolean) options.get("allowMultiLocation"));
    assertTrue((Boolean) options.get("allowAdvancedPermissions"));
    assertTrue((Boolean) options.get("allowAdvancedAudit"));
  }

  @Test
  @DisplayName("Should check feature enabled in map")
  void testFeatureEnabled() {
    Map<String, Object> settings = Map.of("modules", Map.of("cash", true));

    assertTrue(featureAccessService.isFeatureEnabled(settings, "cash"));
  }

  @Test
  @DisplayName("Should return false for disabled features")
  void testFeatureDisabled() {
    Map<String, Object> settings = Map.of("modules", Map.of("shifts", false));

    assertFalse(featureAccessService.isFeatureEnabled(settings, "shifts"));
  }

  @Test
  @DisplayName("Should handle missing feature key")
  void testMissingFeature() {
    Map<String, Object> settings = Map.of("modules", Map.of());

    assertFalse(featureAccessService.isFeatureEnabled(settings, "unknown"));
  }

  @Test
  @DisplayName("Should compare payment methods between plans")
  void testPaymentMethodsByPlan() {
    Map<String, Object> sync = featureAccessService.getAvailableOptionsByPlan(PlanType.SYNC);
    List<?> syncPayments = (List<?>) sync.get("paymentMethods");

    assertNotNull(syncPayments);
    assertTrue(syncPayments.size() > 0);
    assertTrue(syncPayments.contains("CASH"));
  }

  @Test
  @DisplayName("Should have vehicle types for all plans")
  void testVehicleTypesAvailable() {
    for (PlanType plan : PlanType.values()) {
      Map<String, Object> options = featureAccessService.getAvailableOptionsByPlan(plan);
      List<?> types = (List<?>) options.get("vehicleTypes");

      assertNotNull(types);
      assertTrue(types.size() > 0);
    }
  }

  @Test
  @DisplayName("Should restrict features in SYNC plan")
  void testSyncRestrictions() {
    Map<String, Object> options = featureAccessService.getAvailableOptionsByPlan(PlanType.SYNC);

    assertFalse((Boolean) options.get("allowMultiLocation"));
    assertFalse((Boolean) options.get("allowAdvancedPermissions"));
  }

  @Test
  @DisplayName("Should handle null settings gracefully")
  void testNullSettings() {
    Map<String, Object> settings = Map.of("modules", Map.of());
    boolean result = featureAccessService.isFeatureEnabled(settings, "cash");

    assertFalse(result);
  }

  @Test
  @DisplayName("Should handle empty modules map")
  void testEmptyModules() {
    Map<String, Object> settings = Map.of("modules", Map.of());

    assertFalse(featureAccessService.isFeatureEnabled(settings, "cash"));
  }
}
