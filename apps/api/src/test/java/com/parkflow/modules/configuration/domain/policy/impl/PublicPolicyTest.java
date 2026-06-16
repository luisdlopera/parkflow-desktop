package com.parkflow.modules.configuration.domain.policy.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class PublicPolicyTest {

  private PublicPolicy policy;

  @BeforeEach
  void setUp() {
    policy = new PublicPolicy();
  }

  @Test
  void getProfile_ShouldReturnPUBLIC() {
    assertThat(policy.getProfile()).isEqualTo(OperationalProfile.PUBLIC);
  }

  @Test
  void hasCapability_ShouldReturnTrueForAll() {
    for (OperationalCapability cap : OperationalCapability.values()) {
      assertThat(policy.hasCapability(cap)).isTrue();
    }
  }

  @Test
  void getDerivedConfiguration_ShouldHaveAllEnabled() {
    var config = policy.getDerivedConfiguration();
    assertThat(config.get("defaultVehicleType")).isEqualTo("CAR");
    assertThat(config.get("defaultVisitorType")).isEqualTo("VISITOR");
    assertThat(config.get("enableManualRate")).isEqualTo(true);
    assertThat(config.get("enableLaneSelection")).isEqualTo(true);
    assertThat(config.get("enableVehicleCondition")).isEqualTo(true);
  }

  @Test
  void validateEntry_ShouldNotThrow() {
    org.junit.jupiter.api.Assertions.assertDoesNotThrow(
        () -> policy.validateEntry("CAR", "VISITOR", null, null, null));
    org.junit.jupiter.api.Assertions.assertDoesNotThrow(
        () -> policy.validateEntry("MOTORCYCLE", "AGREEMENT", "LANE-1", "TERM-1", null));
  }
}
