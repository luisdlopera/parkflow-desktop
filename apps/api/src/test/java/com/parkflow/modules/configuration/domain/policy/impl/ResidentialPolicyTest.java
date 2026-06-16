package com.parkflow.modules.configuration.domain.policy.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ResidentialPolicyTest {

  private ResidentialPolicy policy;

  @BeforeEach
  void setUp() {
    policy = new ResidentialPolicy();
  }

  @Test
  void getProfile_ShouldReturnRESIDENTIAL() {
    assertThat(policy.getProfile()).isEqualTo(OperationalProfile.RESIDENTIAL);
  }

  @Test
  void hasCapability_vehicleTypeSelectionIsTrue() {
    assertThat(policy.hasCapability(OperationalCapability.VEHICLE_TYPE_SELECTION)).isTrue();
  }

  @Test
  void hasCapability_visitorTypeSelectionIsTrue() {
    assertThat(policy.hasCapability(OperationalCapability.VISITOR_TYPE_SELECTION)).isTrue();
  }

  @Test
  void hasCapability_laneSelectionIsTrue() {
    assertThat(policy.hasCapability(OperationalCapability.LANE_SELECTION)).isTrue();
  }

  @Test
  void hasCapability_observationsIsTrue() {
    assertThat(policy.hasCapability(OperationalCapability.OBSERVATIONS)).isTrue();
  }

  @Test
  void hasCapability_advancedSectionIsFalse() {
    assertThat(policy.hasCapability(OperationalCapability.ADVANCED_SECTION)).isFalse();
  }

  @Test
  void hasCapability_manualRateOverrideIsFalse() {
    assertThat(policy.hasCapability(OperationalCapability.MANUAL_RATE_OVERRIDE)).isFalse();
  }

  @Test
  void hasCapability_terminalSelectionIsFalse() {
    assertThat(policy.hasCapability(OperationalCapability.TERMINAL_SELECTION)).isFalse();
  }

  @Test
  void hasCapability_cashierSelectionIsFalse() {
    assertThat(policy.hasCapability(OperationalCapability.CASHIER_SELECTION)).isFalse();
  }

  @Test
  void hasCapability_vehicleConditionCheckIsFalse() {
    assertThat(policy.hasCapability(OperationalCapability.VEHICLE_CONDITION_CHECK)).isFalse();
  }

  @Test
  void hasCapability_countryPlateFormattingIsFalse() {
    assertThat(policy.hasCapability(OperationalCapability.COUNTRY_PLATE_FORMATTING)).isFalse();
  }

  @Test
  void getDerivedConfiguration_defaultVisitorTypeIsResident() {
    var config = policy.getDerivedConfiguration();
    assertThat(config.get("defaultVehicleType")).isEqualTo("CAR");
    assertThat(config.get("defaultVisitorType")).isEqualTo("RESIDENT");
    assertThat(config.get("showAdvancedSection")).isEqualTo(false);
  }
}
