package com.parkflow.modules.configuration.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.configuration.domain.policy.impl.CarOnlyPolicy;
import com.parkflow.modules.configuration.domain.policy.impl.MixedPolicy;
import com.parkflow.modules.configuration.domain.policy.impl.MotorcycleOnlyPolicy;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OperationalConfigurationServiceTest {

  @Mock
  private CompanyPort companyPort;

  private OperationalConfigurationService service;

  @BeforeEach
  void setUp() {
    service = new OperationalConfigurationService(companyPort,
        List.of(new MixedPolicy(), new CarOnlyPolicy(), new MotorcycleOnlyPolicy()));
    when(companyPort.findById(any())).thenReturn(Optional.empty());
  }

  @Test
  void getOperationConfiguration_ShouldReturnMapWithAllKeys() {
    var config = service.getOperationConfiguration(UUID.randomUUID());
    assertThat(config).containsKeys(
        "showVehicleType", "defaultVehicleType", "showVisitorType", "defaultVisitorType",
        "showAdvancedSection", "enableManualRate", "enableLaneSelection",
        "enableTerminalSelection", "enableCashierSelection", "enableVehicleCondition",
        "enableObservations", "enableCountryPlate");
    assertThat(config.get("enableManualRate")).isEqualTo(false);
  }

  @Test
  void validateEntryPayload_ShouldNotThrow_ForMixedPolicy() {
    assertThatCode(() -> service.validateEntryPayload(UUID.randomUUID(), "MOTORCYCLE", "VISITOR", null, null, null))
        .doesNotThrowAnyException();
  }

  @Test
  void validateEntryPayload_ShouldNotThrow_ForAnyVehicleType() {
    assertThatCode(() -> service.validateEntryPayload(UUID.randomUUID(), "CAR", "VISITOR", null, null, null))
        .doesNotThrowAnyException();
    assertThatCode(() -> service.validateEntryPayload(UUID.randomUUID(), "BICYCLE", "AGREEMENT", null, null, null))
        .doesNotThrowAnyException();
    assertThatCode(() -> service.validateEntryPayload(UUID.randomUUID(), "TRUCK", "EMPLOYEE", null, null, null))
        .doesNotThrowAnyException();
  }

  @Test
  void validateAdvancedFields_ShouldNotThrow_WhenLaneIsNull() {
    assertThatCode(() -> service.validateAdvancedFields(UUID.randomUUID(), null, null, null))
        .doesNotThrowAnyException();
  }

  @Test
  void validateAdvancedFields_ShouldNotThrow_WhenFieldsProvidedInMixedProfile() {
    assertThatCode(() -> service.validateAdvancedFields(UUID.randomUUID(), "LANE-1", "TERM-1", "CASHIER-1"))
        .doesNotThrowAnyException();
  }
}
