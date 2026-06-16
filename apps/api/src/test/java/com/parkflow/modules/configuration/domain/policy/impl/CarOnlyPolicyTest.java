package com.parkflow.modules.configuration.domain.policy.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.parkflow.modules.common.exception.domain.BusinessValidationException;
import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CarOnlyPolicyTest {

  private CarOnlyPolicy policy;

  @BeforeEach
  void setUp() {
    policy = new CarOnlyPolicy();
  }

  @Test
  void getProfile_ShouldReturnCAR_ONLY() {
    assertThat(policy.getProfile()).isEqualTo(OperationalProfile.CAR_ONLY);
  }

  @Test
  void hasCapability_ShouldReturnFalseForAll() {
    for (OperationalCapability cap : OperationalCapability.values()) {
      assertThat(policy.hasCapability(cap)).isFalse();
    }
  }

  @Test
  void validateEntry_ShouldAcceptCar() {
    assertThatCode(() -> policy.validateEntry("CAR", "VISITOR", null, null, null))
        .doesNotThrowAnyException();
    assertThatCode(() -> policy.validateEntry("CARRO", "AGREEMENT", null, null, null))
        .doesNotThrowAnyException();
  }

  @Test
  void validateEntry_ShouldRejectMotorcycle() {
    Throwable thrown = catchThrowable(() -> policy.validateEntry("MOTORCYCLE", "VISITOR", null, null, null));
    assertThat(thrown).isInstanceOf(BusinessValidationException.class)
        .hasMessageContaining("SOLO_CARRO");
  }

  @Test
  void validateEntry_ShouldRejectBicycle() {
    Throwable thrown = catchThrowable(() -> policy.validateEntry("BICYCLE", "VISITOR", null, null, null));
    assertThat(thrown).isInstanceOf(BusinessValidationException.class)
        .hasMessageContaining("SOLO_CARRO");
  }

  @Test
  void validateEntry_ShouldRejectTruck() {
    Throwable thrown = catchThrowable(() -> policy.validateEntry("TRUCK", "VISITOR", null, null, null));
    assertThat(thrown).isInstanceOf(BusinessValidationException.class)
        .hasMessageContaining("SOLO_CARRO");
  }

  @Test
  void resolveVehicleType_ShouldForceCar() {
    assertThat(policy.resolveVehicleType("MOTORCYCLE")).isEqualTo("CAR");
    assertThat(policy.resolveVehicleType("BICYCLE")).isEqualTo("CAR");
    assertThat(policy.resolveVehicleType("TRUCK")).isEqualTo("CAR");
  }

  @Test
  void getDerivedConfiguration_ShouldHaveDefaults() {
    var config = policy.getDerivedConfiguration();
    assertThat(config.get("defaultVehicleType")).isEqualTo("CAR");
    assertThat(config.get("defaultVisitorType")).isEqualTo("VISITOR");
  }
}
