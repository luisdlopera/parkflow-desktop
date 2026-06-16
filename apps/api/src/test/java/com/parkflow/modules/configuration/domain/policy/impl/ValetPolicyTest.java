package com.parkflow.modules.configuration.domain.policy.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ValetPolicyTest {

  private ValetPolicy policy;

  @BeforeEach
  void setUp() {
    policy = new ValetPolicy();
  }

  @Test
  void getProfile_ShouldReturnVALET() {
    assertThat(policy.getProfile()).isEqualTo(OperationalProfile.VALET);
  }

  @Test
  void hasCapability_vehicleTypeSelectionIsTrue() {
    assertThat(policy.hasCapability(OperationalCapability.VEHICLE_TYPE_SELECTION)).isTrue();
  }

  @Test
  void hasCapability_advancedSectionIsTrue() {
    assertThat(policy.hasCapability(OperationalCapability.ADVANCED_SECTION)).isTrue();
  }

  @Test
  void hasCapability_cashierSelectionIsTrue() {
    assertThat(policy.hasCapability(OperationalCapability.CASHIER_SELECTION)).isTrue();
  }

  @Test
  void hasCapability_vehicleConditionCheckIsTrue() {
    assertThat(policy.hasCapability(OperationalCapability.VEHICLE_CONDITION_CHECK)).isTrue();
  }

  @Test
  void hasCapability_observationsIsTrue() {
    assertThat(policy.hasCapability(OperationalCapability.OBSERVATIONS)).isTrue();
  }

  @Test
  void hasCapability_visitorTypeSelectionIsFalse() {
    assertThat(policy.hasCapability(OperationalCapability.VISITOR_TYPE_SELECTION)).isFalse();
  }

  @Test
  void hasCapability_manualRateOverrideIsFalse() {
    assertThat(policy.hasCapability(OperationalCapability.MANUAL_RATE_OVERRIDE)).isFalse();
  }

  @Test
  void hasCapability_laneSelectionIsFalse() {
    assertThat(policy.hasCapability(OperationalCapability.LANE_SELECTION)).isFalse();
  }

  @Test
  void hasCapability_terminalSelectionIsFalse() {
    assertThat(policy.hasCapability(OperationalCapability.TERMINAL_SELECTION)).isFalse();
  }

  @Test
  void getDerivedConfiguration_shouldHaveDefaults() {
    var config = policy.getDerivedConfiguration();
    assertThat(config.get("defaultVehicleType")).isEqualTo("CAR");
    assertThat(config.get("defaultVisitorType")).isEqualTo("VISITOR");
    assertThat(config.get("showAdvancedSection")).isEqualTo(true);
    assertThat(config.get("enableVehicleCondition")).isEqualTo(true);
  }
}
