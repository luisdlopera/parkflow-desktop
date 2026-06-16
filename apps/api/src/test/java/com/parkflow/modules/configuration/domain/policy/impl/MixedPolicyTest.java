package com.parkflow.modules.configuration.domain.policy.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MixedPolicyTest {

  private MixedPolicy policy;

  @BeforeEach
  void setUp() {
    policy = new MixedPolicy();
  }

  @Test
  void getProfile_ShouldReturnMIXED() {
    assertThat(policy.getProfile()).isEqualTo(OperationalProfile.MIXED);
  }

  @Test
  void hasCapability_ShouldReturnTrueForAllExceptManualRateOverride() {
    for (OperationalCapability cap : OperationalCapability.values()) {
      if (cap == OperationalCapability.MANUAL_RATE_OVERRIDE) {
        assertThat(policy.hasCapability(cap)).isFalse();
      } else {
        assertThat(policy.hasCapability(cap)).isTrue();
      }
    }
  }

  @Test
  void hasCapability_manualRateOverrideIsFalse() {
    assertThat(policy.hasCapability(OperationalCapability.MANUAL_RATE_OVERRIDE)).isFalse();
  }

  @Test
  void getDerivedConfiguration_ShouldContainAllKeys() {
    var config = policy.getDerivedConfiguration();
    assertThat(config).containsKeys(
        "showVehicleType", "defaultVehicleType", "showVisitorType", "defaultVisitorType",
        "showAdvancedSection", "enableManualRate", "enableLaneSelection", "enableTerminalSelection",
        "enableCashierSelection", "enableVehicleCondition", "enableObservations", "enableCountryPlate");
    assertThat(config.get("defaultVehicleType")).isEqualTo("CAR");
    assertThat(config.get("defaultVisitorType")).isEqualTo("VISITOR");
    assertThat(config.get("enableManualRate")).isEqualTo(false);
  }

  @Test
  void validateEntry_ShouldNotThrowForAnyVehicleType() {
    assertThatCode(() -> policy.validateEntry("CAR", "VISITOR", null, null, null))
        .doesNotThrowAnyException();
    assertThatCode(() -> policy.validateEntry("MOTORCYCLE", "AGREEMENT", null, null, null))
        .doesNotThrowAnyException();
    assertThatCode(() -> policy.validateEntry("BICYCLE", "SUBSCRIBER", null, null, null))
        .doesNotThrowAnyException();
    assertThatCode(() -> policy.validateEntry("TRUCK", "EMPLOYEE", null, null, null))
        .doesNotThrowAnyException();
  }

  @Test
  void resolveVehicleType_ShouldReturnSameType() {
    assertThat(policy.resolveVehicleType("CAR")).isEqualTo("CAR");
    assertThat(policy.resolveVehicleType("MOTORCYCLE")).isEqualTo("MOTORCYCLE");
    assertThat(policy.resolveVehicleType("BICYCLE")).isEqualTo("BICYCLE");
  }
}
