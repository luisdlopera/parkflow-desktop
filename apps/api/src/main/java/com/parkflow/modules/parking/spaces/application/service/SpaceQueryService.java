package com.parkflow.modules.parking.spaces.application.service;

import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignment;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceDto;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceOccupancySummaryResponse;
import com.parkflow.modules.parking.spaces.application.port.in.SpaceQueryUseCase;
import com.parkflow.modules.parking.spaces.application.port.out.ParkingSpaceAssignmentRepositoryPort;
import com.parkflow.modules.parking.spaces.application.port.out.ParkingSpaceRepositoryPort;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles space query operations: get occupancy, list spaces, find assignments.
 * Max 3 methods (read-only queries).
 */
@Service
@RequiredArgsConstructor
public class SpaceQueryService implements SpaceQueryUseCase {

  private final ParkingSpaceRepositoryPort parkingSpaceRepository;
  private final ParkingSpaceAssignmentRepositoryPort parkingSpaceAssignmentRepository;

  @Transactional(readOnly = true)
  public ParkingSpaceOccupancySummaryResponse getOccupancySummary(UUID companyId) {
    long total = parkingSpaceRepository.countByCompanyId(companyId);
    long active = parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.ACTIVE);
    long maintenance =
        parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.MAINTENANCE);
    long inactive = parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.INACTIVE);
    long occupied = parkingSpaceAssignmentRepository.countByCompanyIdAndReleasedAtIsNull(companyId);
    long available = Math.max(active - occupied, 0);
    double occupancy = active > 0 ? Math.min((occupied * 100.0) / active, 100.0) : 0.0;

    return new ParkingSpaceOccupancySummaryResponse(
        companyId, total, active, occupied, available, maintenance, inactive, occupancy);
  }

  @Transactional(readOnly = true)
  public List<ParkingSpaceDto> listSpaces(UUID companyId, String filter) {
    return parkingSpaceRepository.findByCompanyIdOrderBySortOrderAscCodeAsc(companyId).stream()
        .filter(s -> {
          if ("ALL".equalsIgnoreCase(filter)) return true;
          if ("INACTIVE".equalsIgnoreCase(filter)) return s.getStatus() == ParkingSpaceStatus.INACTIVE;
          return s.getStatus() == ParkingSpaceStatus.ACTIVE || s.getStatus() == ParkingSpaceStatus.MAINTENANCE;
        })
        .map(
            s -> {
              boolean occupied = parkingSpaceAssignmentRepository.existsByParkingSpace_IdAndReleasedAtIsNull(s.getId());
              UUID activeSessionId =
                  occupied
                      ? parkingSpaceAssignmentRepository
                          .findActiveByParkingSpaceId(s.getId())
                          .map(a -> a.getParkingSession().getId())
                          .orElse(null)
                      : null;
              return new ParkingSpaceDto(
                  s.getId(),
                  s.getCode(),
                  s.getLabel(),
                  s.getType(),
                  s.getStatus(),
                  s.getSortOrder(),
                  occupied,
                  activeSessionId);
            })
        .toList();
  }

  @Transactional(readOnly = true)
  public ParkingSpaceAssignment findAssignmentBySessionId(UUID parkingSessionId) {
    return parkingSpaceAssignmentRepository.findLatestByParkingSessionId(parkingSessionId).orElse(null);
  }
}
