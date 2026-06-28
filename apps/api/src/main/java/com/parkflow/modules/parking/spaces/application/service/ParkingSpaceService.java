package com.parkflow.modules.parking.spaces.application.service;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.spaces.domain.ParkingSpace;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignment;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignmentStatus;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceType;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceDto;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceOccupancySummaryResponse;
import com.parkflow.modules.parking.spaces.infrastructure.persistence.ParkingSpaceAssignmentRepository;
import com.parkflow.modules.parking.spaces.infrastructure.persistence.ParkingSpaceRepository;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * @deprecated Use {@link SpaceManagementService} and {@link SpaceQueryService} instead.
 * This class maintained for backward compatibility during migration to hexagonal architecture.
 */
@Deprecated(since = "2.1.0", forRemoval = false)
@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class ParkingSpaceService {

  private final ParkingSpaceRepository parkingSpaceRepository;
  private final ParkingSpaceAssignmentRepository parkingSpaceAssignmentRepository;

  @Deprecated
  @Transactional
  public ParkingSpace assignNextAvailableSpace(UUID companyId, ParkingSession session) {

    ParkingSpace space =
        parkingSpaceRepository
            .findFirstAvailableForUpdate(companyId)
            .orElseThrow(
                () ->
                    new OperationException(
                        HttpStatus.CONFLICT,
                        "PARKING_FULL",
                        "No hay celdas disponibles para este negocio."));

    ParkingSpaceAssignment assignment = new ParkingSpaceAssignment();
    assignment.setCompanyId(companyId);
    assignment.setParkingSpace(space);
    assignment.setParkingSession(session);
    assignment.setAssignedAt(OffsetDateTime.now());
    assignment.setStatus(ParkingSpaceAssignmentStatus.ACTIVE);
    parkingSpaceAssignmentRepository.save(assignment);
    return space;
  }

  @Deprecated
  @Transactional
  public ParkingSpace assignSpecificSpace(UUID companyId, UUID parkingSpaceId, ParkingSession session) {
    ParkingSpace space =
        parkingSpaceRepository
            .findByIdAndCompanyIdForUpdate(parkingSpaceId, companyId)
            .orElseThrow(
                () ->
                    new OperationException(
                        HttpStatus.NOT_FOUND,
                        "PARKING_SPACE_NOT_FOUND",
                        "La celda indicada no existe para este negocio."));

    if (space.getStatus() != ParkingSpaceStatus.ACTIVE) {
      throw new OperationException(
          HttpStatus.CONFLICT,
          "PARKING_SPACE_NOT_ACTIVE",
          "La celda indicada no está activa.");
    }

    if (parkingSpaceAssignmentRepository.existsByParkingSpace_IdAndReleasedAtIsNull(space.getId())) {
      throw new OperationException(
          HttpStatus.CONFLICT,
          "PARKING_SPACE_OCCUPIED",
          "La celda indicada ya está ocupada.");
    }

    ParkingSpaceAssignment assignment = new ParkingSpaceAssignment();
    assignment.setCompanyId(companyId);
    assignment.setParkingSpace(space);
    assignment.setParkingSession(session);
    assignment.setAssignedAt(OffsetDateTime.now());
    assignment.setStatus(ParkingSpaceAssignmentStatus.ACTIVE);
    parkingSpaceAssignmentRepository.save(assignment);
    return space;
  }

  @Deprecated
  @Transactional
  public void releaseSpaceBySession(UUID parkingSessionId) {
    parkingSpaceAssignmentRepository
        .findActiveByParkingSessionId(parkingSessionId)
        .ifPresent(
            assignment -> {
              assignment.setReleasedAt(OffsetDateTime.now());
              assignment.setStatus(ParkingSpaceAssignmentStatus.RELEASED);
              parkingSpaceAssignmentRepository.save(assignment);
            });
  }

  @Deprecated
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

  @Deprecated
  @Transactional
  public ParkingSpaceOccupancySummaryResponse resizeCapacity(UUID companyId, int newCapacity) {
    if (newCapacity < 0) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "INVALID_CAPACITY", "La capacidad no puede ser negativa.");
    }

    List<ParkingSpace> allSpaces = parkingSpaceRepository.findByCompanyIdOrderBySortOrderAscCodeAsc(companyId);
    long occupiedSpaces = parkingSpaceAssignmentRepository.countByCompanyIdAndReleasedAtIsNull(companyId);

    if (newCapacity < occupiedSpaces) {
      throw new OperationException(
          HttpStatus.CONFLICT,
          "CAPACITY_BELOW_OCCUPIED",
          "No se puede reducir capacidad por debajo de celdas ocupadas.");
    }

    long activeSpaces = allSpaces.stream().filter(s -> s.getStatus() == ParkingSpaceStatus.ACTIVE).count();

    if (newCapacity > activeSpaces) {
      int toActivate = (int) (newCapacity - activeSpaces);

      List<ParkingSpace> inactiveSpaces = allSpaces.stream()
          .filter(s -> s.getStatus() == ParkingSpaceStatus.INACTIVE)
          .sorted(Comparator.comparingInt(ParkingSpace::getSortOrder))
          .toList();

      for (ParkingSpace space : inactiveSpaces) {
        if (toActivate == 0) break;
        space.setStatus(ParkingSpaceStatus.ACTIVE);
        parkingSpaceRepository.save(space);
        toActivate--;
      }

      if (toActivate > 0) {
        int maxSortOrder = allSpaces.stream().mapToInt(ParkingSpace::getSortOrder).max().orElse(0);
        int next = maxSortOrder + 1;
        for (int i = 0; i < toActivate; i++) {
          ParkingSpace space = new ParkingSpace();
          space.setCompanyId(companyId);
          space.setCode(String.format("C%03d", next + i));
          space.setLabel("Celda " + String.format("%03d", next + i));
          space.setType(ParkingSpaceType.GENERAL);
          space.setStatus(ParkingSpaceStatus.ACTIVE);
          space.setSortOrder(next + i);
          parkingSpaceRepository.save(space);
        }
      }
    } else if (newCapacity < activeSpaces) {
      int toDisable = (int) (activeSpaces - newCapacity);
      List<ParkingSpace> activeDesc =
          allSpaces.stream()
              .filter(s -> s.getStatus() == ParkingSpaceStatus.ACTIVE)
              .sorted(Comparator.comparingInt(ParkingSpace::getSortOrder).reversed())
              .toList();

      for (ParkingSpace space : activeDesc) {
        if (toDisable == 0) break;
        if (parkingSpaceAssignmentRepository.existsByParkingSpace_IdAndReleasedAtIsNull(space.getId())) {
          continue;
        }

        space.setStatus(ParkingSpaceStatus.INACTIVE);
        parkingSpaceRepository.save(space);
        toDisable--;
      }

      if (toDisable > 0) {
        throw new OperationException(
            HttpStatus.CONFLICT,
            "CAPACITY_REDUCTION_BLOCKED",
            "No hay suficientes celdas libres para reducir a la capacidad solicitada.");
      }
    }

    return getOccupancySummary(companyId);
  }

  @Deprecated
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

  @Deprecated
  @Transactional
  public ParkingSpaceDto patchSpace(
      UUID companyId,
      UUID spaceId,
      ParkingSpaceStatus status,
      String label,
      ParkingSpaceType type) {
    ParkingSpace space =
        parkingSpaceRepository
            .findByIdAndCompanyId(spaceId, companyId)
            .orElseThrow(
                () ->
                    new OperationException(
                        HttpStatus.NOT_FOUND,
                        "PARKING_SPACE_NOT_FOUND",
                        "La celda indicada no existe para este negocio."));

    if (status != null) {
      if (status != ParkingSpaceStatus.ACTIVE
          && parkingSpaceAssignmentRepository.existsByParkingSpace_IdAndReleasedAtIsNull(space.getId())) {
        throw new OperationException(
            HttpStatus.CONFLICT,
            "PARKING_SPACE_OCCUPIED",
            "No se puede desactivar o poner en mantenimiento una celda ocupada.");
      }
      space.setStatus(status);
    }
    if (label != null) {
      space.setLabel(label.isBlank() ? null : label.trim());
    }
    if (type != null) {
      space.setType(type);
    }

    ParkingSpace saved = parkingSpaceRepository.save(space);
    boolean occupied = parkingSpaceAssignmentRepository.existsByParkingSpace_IdAndReleasedAtIsNull(saved.getId());
    return new ParkingSpaceDto(
        saved.getId(),
        saved.getCode(),
        saved.getLabel(),
        saved.getType(),
        saved.getStatus(),
        saved.getSortOrder(),
        occupied,
        null);
  }

  @Deprecated
  @Transactional(readOnly = true)
  public ParkingSpaceAssignment findAssignmentBySessionId(UUID parkingSessionId) {
    return parkingSpaceAssignmentRepository.findLatestByParkingSessionId(parkingSessionId).orElse(null);
  }
}
