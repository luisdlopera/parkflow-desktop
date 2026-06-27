package com.parkflow.modules.parking.spaces.application.port.in;

import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignment;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceDto;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceOccupancySummaryResponse;
import java.util.List;
import java.util.UUID;

public interface SpaceQueryUseCase {
  ParkingSpaceOccupancySummaryResponse getOccupancySummary(UUID companyId);
  List<ParkingSpaceDto> listSpaces(UUID companyId, String filter);
  ParkingSpaceAssignment findAssignmentBySessionId(UUID parkingSessionId);
}
