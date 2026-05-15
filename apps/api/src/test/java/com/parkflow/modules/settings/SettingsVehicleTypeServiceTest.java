package com.parkflow.modules.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.dto.VehicleTypeRequest;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import com.parkflow.modules.settings.application.service.SettingsVehicleTypeService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class SettingsVehicleTypeServiceTest {

  @Mock private MasterVehicleTypePort repository;

  private SettingsVehicleTypeService service;

  @BeforeEach
  void setUp() {
    service = new SettingsVehicleTypeService(repository);
  }

  @Test
  void createPersistsVehicleTypeWhenCodeIsUnique() {
    when(repository.findByCode("BICYCLE")).thenReturn(Optional.empty());
    when(repository.save(any(MasterVehicleType.class)))
        .thenAnswer(
            invocation -> {
              MasterVehicleType type = invocation.getArgument(0);
              type.setId(UUID.randomUUID());
              return type;
            });

    var response =
        service.create(new VehicleTypeRequest("BICYCLE", "Bicicleta", "🚲", "#16A34A", false, true, true, false, 6));

    assertThat(response.code()).isEqualTo("BICYCLE");
    assertThat(response.name()).isEqualTo("Bicicleta");
    assertThat(response.icon()).isEqualTo("🚲");
    assertThat(response.color()).isEqualTo("#16A34A");
    assertThat(response.requiresPlate()).isFalse();
    assertThat(response.hasOwnRate()).isTrue();
    assertThat(response.quickAccess()).isTrue();
    assertThat(response.isActive()).isTrue();
    verify(repository).save(any(MasterVehicleType.class));
  }

  @Test
  void createRejectsDuplicateCode() {
    when(repository.findByCode("CAR")).thenReturn(Optional.of(new MasterVehicleType()));

    assertThatThrownBy(() -> service.create(new VehicleTypeRequest("CAR", "Automovil", "🚗", "#2563EB", true, true, true, false, 1)))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void updateRejectsDuplicateCodeFromAnotherType() {
    UUID id = UUID.randomUUID();
    MasterVehicleType current = type(id, "BIKE");
    MasterVehicleType existing = type(UUID.randomUUID(), "CAR");
    when(repository.findById(id)).thenReturn(Optional.of(current));
    when(repository.findByCode("CAR")).thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> service.update(id, new VehicleTypeRequest("CAR", "Carro", "🚗", "#2563EB", true, true, true, false, 1)))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void patchStatusDeactivatesType() {
    UUID id = UUID.randomUUID();
    MasterVehicleType current = type(id, "CAR");
    current.setActive(true);
    when(repository.findById(id)).thenReturn(Optional.of(current));

    service.patchStatus(id, false);

    assertThat(current.isActive()).isFalse();
    verify(repository).save(current);
  }

  @Test
  void deleteSoftDeactivatesTypeInsteadOfRemovingIt() {
    UUID id = UUID.randomUUID();
    MasterVehicleType current = type(id, "CAR");
    current.setActive(true);
    when(repository.findById(id)).thenReturn(Optional.of(current));

    service.delete(id);

    assertThat(current.isActive()).isFalse();
    verify(repository).save(current);
  }

  private static MasterVehicleType type(UUID id, String code) {
    MasterVehicleType type = new MasterVehicleType();
    type.setId(id);
    type.setCode(code);
    type.setName(code);
    return type;
  }
}
