package com.parkflow.modules.configuration.domain.policy.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class EnterprisePolicyTest {

  private EnterprisePolicy policy;

  @BeforeEach
  void setUp() {
    policy = new EnterprisePolicy();
  }

  @Test
  void getProfile_ShouldReturnENTERPRISE() {
    assertThat(policy.getProfile()).isEqualTo(OperationalProfile.ENTERPRISE);
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
  void getDerivedConfiguration_defaultVisitorTypeIsEmployee() {
    var config = policy.getDerivedConfiguration();
    assertThat(config.get("defaultVisitorType")).isEqualTo("EMPLOYEE");
    assertThat(config.get("defaultVehicleType")).isEqualTo("CAR");
    assertThat(config.get("enableManualRate")).isEqualTo(false);
  }

  @Test
  void validateEntry_ShouldNotThrow() {
    org.junit.jupiter.api.Assertions.assertDoesNotThrow(
        () -> policy.validateEntry("CAR", "EMPLOYEE", null, null, null));
    org.junit.jupiter.api.Assertions.assertDoesNotThrow(
        () -> policy.validateEntry("MOTORCYCLE", "VISITOR", null, null, null));
  }
}
