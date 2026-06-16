package com.parkflow.modules.parking.operation.domain.service;


import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ParkingValidatorServiceTest {

  @Mock
  private ParkingSessionPort parkingSessionPort;

  @Mock
  private ParkingSitePort parkingSiteRepository;

  @InjectMocks
  private ParkingValidatorService service;

  private UUID companyId;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
  }

  @Test
  void assertVehicleNotActive_ShouldThrow_WhenActiveSessionExists() {
    String plate = "ABC123";
    ParkingSession existingSession = createActiveSession(plate);
    when(parkingSessionPort.findActiveByPlateForUpdate(eq(SessionStatus.ACTIVE), eq(plate), eq(companyId)))
        .thenReturn(Optional.of(existingSession));

    assertThatThrownBy(() -> service.assertVehicleNotActive(plate, companyId))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("ya tiene una sesión activa");
  }

  @Test
  void assertVehicleNotActive_ShouldPass_WhenNoActiveSession() {
    String plate = "ABC123";
    when(parkingSessionPort.findActiveByPlateForUpdate(eq(SessionStatus.ACTIVE), eq(plate), eq(companyId)))
        .thenReturn(Optional.empty());

    service.assertVehicleNotActive(plate, companyId);
  }

  @Test
  void assertCapacityAvailable_ShouldPass_WhenNoSiteProvided() {
    service.assertCapacityAvailable(null, companyId);
    service.assertCapacityAvailable("", companyId);
    service.assertCapacityAvailable("  ", companyId);
  }

  @Test
  void assertCapacityAvailable_ShouldPass_WhenSiteNotFound() {
    when(parkingSiteRepository.findByCodeOrNameForUpdate(any(), eq(companyId)))
        .thenReturn(Optional.empty());

    service.assertCapacityAvailable("UNKNOWN-SITE", companyId);
  }

  @Test
  void assertCapacityAvailable_ShouldThrow_WhenSiteIsInactive() {
    ParkingSite site = createSite("TEST-SITE", 10, false);
    when(parkingSiteRepository.findByCodeOrNameForUpdate("TEST-SITE", companyId))
        .thenReturn(Optional.of(site));

    assertThatThrownBy(() -> service.assertCapacityAvailable("TEST-SITE", companyId))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("inactiva");
  }

  @Test
  void assertCapacityAvailable_ShouldPass_WhenMaxCapacityIsZero() {
    ParkingSite site = createSite("TEST-SITE", 0, true);
    when(parkingSiteRepository.findByCodeOrNameForUpdate("TEST-SITE", companyId))
        .thenReturn(Optional.of(site));

    service.assertCapacityAvailable("TEST-SITE", companyId);
  }

  @Test
  void assertCapacityAvailable_ShouldPass_WhenMaxCapacityIsNegative() {
    ParkingSite site = createSite("TEST-SITE", -1, true);
    when(parkingSiteRepository.findByCodeOrNameForUpdate("TEST-SITE", companyId))
        .thenReturn(Optional.of(site));

    service.assertCapacityAvailable("TEST-SITE", companyId);
  }

  @Test
  void assertCapacityAvailable_ShouldPass_WhenBelowCapacity() {
    ParkingSite site = createSite("TEST-SITE", 10, true);
    when(parkingSiteRepository.findByCodeOrNameForUpdate("TEST-SITE", companyId))
        .thenReturn(Optional.of(site));
    when(parkingSessionPort.countByStatusAndSiteAndCompanyId(eq(SessionStatus.ACTIVE), eq("TEST-SITE"), eq(companyId)))
        .thenReturn(5L);

    service.assertCapacityAvailable("TEST-SITE", companyId);
  }

  @Test
  void assertCapacityAvailable_ShouldThrow_WhenAtExactCapacity() {
    ParkingSite site = createSite("TEST-SITE", 10, true);
    when(parkingSiteRepository.findByCodeOrNameForUpdate("TEST-SITE", companyId))
        .thenReturn(Optional.of(site));
    when(parkingSessionPort.countByStatusAndSiteAndCompanyId(eq(SessionStatus.ACTIVE), eq("TEST-SITE"), eq(companyId)))
        .thenReturn(10L);

    assertThatThrownBy(() -> service.assertCapacityAvailable("TEST-SITE", companyId))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Parqueadero lleno");
  }

  @Test
  void assertCapacityAvailable_ShouldThrow_WhenOverCapacity() {
    ParkingSite site = createSite("TEST-SITE", 10, true);
    when(parkingSiteRepository.findByCodeOrNameForUpdate("TEST-SITE", companyId))
        .thenReturn(Optional.of(site));
    when(parkingSessionPort.countByStatusAndSiteAndCompanyId(eq(SessionStatus.ACTIVE), eq("TEST-SITE"), eq(companyId)))
        .thenReturn(15L);

    assertThatThrownBy(() -> service.assertCapacityAvailable("TEST-SITE", companyId))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Parqueadero lleno");
  }

  @Test
  void assertCapacityAvailable_ShouldTrimSiteName() {
    ParkingSite site = createSite("TEST-SITE", 10, true);
    when(parkingSiteRepository.findByCodeOrNameForUpdate("TEST-SITE", companyId))
        .thenReturn(Optional.of(site));
    when(parkingSessionPort.countByStatusAndSiteAndCompanyId(eq(SessionStatus.ACTIVE), eq("TEST-SITE"), eq(companyId)))
        .thenReturn(5L);

    service.assertCapacityAvailable("  TEST-SITE  ", companyId);
  }

  private ParkingSite createSite(String name, int maxCapacity, boolean active) {
    ParkingSite site = new ParkingSite();
    site.setId(UUID.randomUUID());
    site.setName(name);
    site.setMaxCapacity(maxCapacity);
    site.setActive(active);
    return site;
  }

  private ParkingSession createActiveSession(String plate) {
    Vehicle vehicle = new Vehicle();
    vehicle.setPlate(plate);
    return ParkingSession.builder()
        .id(UUID.randomUUID())
        .plate(plate)
        .vehicle(vehicle)
        .companyId(companyId)
        .status(SessionStatus.ACTIVE)
        .build();
  }
}