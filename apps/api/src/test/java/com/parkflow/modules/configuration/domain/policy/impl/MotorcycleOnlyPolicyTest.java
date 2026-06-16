package com.parkflow.modules.configuration.domain.policy.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.parkflow.modules.common.exception.domain.BusinessValidationException;
import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MotorcycleOnlyPolicyTest {

  private MotorcycleOnlyPolicy policy;

  @BeforeEach
  void setUp() {
    policy = new MotorcycleOnlyPolicy();
  }

  @Test
  void getProfile_ShouldReturnMOTORCYCLE_ONLY() {
    assertThat(policy.getProfile()).isEqualTo(OperationalProfile.MOTORCYCLE_ONLY);
  }

  @Test
  void hasCapability_ShouldReturnFalseForAll() {
    for (OperationalCapability cap : OperationalCapability.values()) {
      assertThat(policy.hasCapability(cap)).isFalse();
    }
  }

  @Test
  void validateEntry_ShouldAcceptMotorcycle() {
    assertThatCode(() -> policy.validateEntry("MOTORCYCLE", "VISITOR", null, null, null))
        .doesNotThrowAnyException();
    assertThatCode(() -> policy.validateEntry("MOTO", "VISITOR", null, null, null))
        .doesNotThrowAnyException();
  }

  @Test
  void validateEntry_ShouldRejectCar() {
    Throwable thrown = catchThrowable(() -> policy.validateEntry("CAR", "VISITOR", null, null, null));
    assertThat(thrown).isInstanceOf(BusinessValidationException.class)
        .hasMessageContaining("SOLO_MOTO");
  }

  @Test
  void validateEntry_ShouldRejectBicycle() {
    Throwable thrown = catchThrowable(() -> policy.validateEntry("BICYCLE", "VISITOR", null, null, null));
    assertThat(thrown).isInstanceOf(BusinessValidationException.class)
        .hasMessageContaining("SOLO_MOTO");
  }

  @Test
  void validateEntry_ShouldRejectNonVisitorEntryMode() {
    Throwable thrown = catchThrowable(() -> policy.validateEntry("MOTORCYCLE", "AGREEMENT", null, null, null));
    assertThat(thrown).isInstanceOf(BusinessValidationException.class)
        .hasMessageContaining("SOLO_MOTO");

    thrown = catchThrowable(() -> policy.validateEntry("MOTORCYCLE", "SUBSCRIBER", null, null, null));
    assertThat(thrown).isInstanceOf(BusinessValidationException.class)
        .hasMessageContaining("SOLO_MOTO");

    thrown = catchThrowable(() -> policy.validateEntry("MOTORCYCLE", "EMPLOYEE", null, null, null));
    assertThat(thrown).isInstanceOf(BusinessValidationException.class)
        .hasMessageContaining("SOLO_MOTO");
  }

  @Test
  void validateEntry_ShouldAcceptNullEntryMode() {
    assertThatCode(() -> policy.validateEntry("MOTORCYCLE", null, null, null, null))
        .doesNotThrowAnyException();
  }

  @Test
  void resolveVehicleType_ShouldForceMotorcycle() {
    assertThat(policy.resolveVehicleType("CAR")).isEqualTo("MOTORCYCLE");
    assertThat(policy.resolveVehicleType("BICYCLE")).isEqualTo("MOTORCYCLE");
  }

  @Test
  void getDerivedConfiguration_ShouldHaveDefaults() {
    var config = policy.getDerivedConfiguration();
    assertThat(config.get("defaultVehicleType")).isEqualTo("MOTORCYCLE");
    assertThat(config.get("defaultVisitorType")).isEqualTo("VISITOR");
  }
}
