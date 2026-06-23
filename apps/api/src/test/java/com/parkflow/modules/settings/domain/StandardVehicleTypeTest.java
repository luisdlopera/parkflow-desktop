package com.parkflow.modules.settings.domain;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Optional;
import org.junit.jupiter.api.Test;

class StandardVehicleTypeTest {

  @Test
  void shouldFindExistingByCode() {
    Optional<StandardVehicleType> car = StandardVehicleType.findByCode("CAR");
    assertTrue(car.isPresent());
    assertEquals("CAR", car.get().getCode());
  }

  @Test
  void shouldNotFindNonExistingByCode() {
    Optional<StandardVehicleType> car = StandardVehicleType.findByCode("UNKNOWN");
    assertFalse(car.isPresent());
  }

  @Test
  void shouldConvertToMasterEntity() {
    StandardVehicleType car = StandardVehicleType.CAR;
    MasterVehicleType entity = StandardVehicleType.toMasterEntity(car);
    
    assertNotNull(entity);
    assertEquals(car.getCode(), entity.getCode());
    assertEquals(car.getName(), entity.getName());
    assertEquals(car.getIcon(), entity.getIcon());
    assertEquals(car.getColor(), entity.getColor());
    assertEquals(car.isRequiresPlate(), entity.isRequiresPlate());
    assertEquals(car.isHasOwnRate(), entity.isHasOwnRate());
    assertEquals(car.isQuickAccess(), entity.isQuickAccess());
    assertEquals(car.isRequiresPhoto(), entity.isRequiresPhoto());
    assertEquals(car.getDisplayOrder(), entity.getDisplayOrder());
    assertTrue(entity.isActive());
  }
}
