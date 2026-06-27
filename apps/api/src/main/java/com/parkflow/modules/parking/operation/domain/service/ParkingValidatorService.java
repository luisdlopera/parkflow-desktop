package com.parkflow.modules.parking.operation.domain.service;

import com.parkflow.modules.configuration.application.port.out.ParkingSitePort;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.application.port.out.ParkingSessionPort;
import com.parkflow.modules.common.exception.OperationException;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ParkingValidatorService {
  private final ParkingSessionPort parkingSessionPort;
  private final ParkingSitePort parkingSiteRepository;

  public void assertVehicleNotActive(String plate, UUID companyId) {
    parkingSessionPort
        .findActiveByPlateForUpdate(SessionStatus.ACTIVE, plate, companyId)
        .ifPresent(s -> {
          throw new OperationException(HttpStatus.CONFLICT, "El vehículo ya tiene una sesión activa");
        });
  }

  public void assertCapacityAvailable(String site, UUID companyId) {
    if (site == null || site.isBlank()) return;
    parkingSiteRepository.findByCodeOrNameForUpdate(site.trim(), companyId)
        .ifPresent(parkingSite -> {
          if (!parkingSite.isActive()) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "La sede está inactiva");
          }
          // Note: Site-level capacity checking is temporarily disabled until
          // ParkingSession is refactored to track site associations.
          // See V022__drop_deprecated_columns.sql - the 'site' field was removed from parking_session.
        });
  }
}
