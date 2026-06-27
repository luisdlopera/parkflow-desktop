package com.parkflow.modules.parking.spaces.application.port.in;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.spaces.domain.ParkingSpace;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceType;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceDto;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceOccupancySummaryResponse;
import java.util.UUID;

public interface SpaceManagementUseCase {
  ParkingSpace assignNextAvailableSpace(UUID companyId, ParkingSession session);
  ParkingSpace assignSpecificSpace(UUID companyId, UUID parkingSpaceId, ParkingSession session);
  void releaseSpaceBySession(UUID parkingSessionId);
  ParkingSpaceOccupancySummaryResponse resizeCapacity(UUID companyId, int newCapacity);
  ParkingSpaceDto patchSpace(UUID companyId, UUID spaceId, ParkingSpaceStatus status, String label, ParkingSpaceType type);
}
