package com.parkflow.modules.parking.spaces.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.spaces.domain.ParkingSpace;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignment;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignmentStatus;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.parking.spaces.repository.ParkingSpaceAssignmentRepository;
import com.parkflow.modules.parking.spaces.repository.ParkingSpaceRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class ParkingSpaceServiceTest {

  @Mock private ParkingSpaceRepository parkingSpaceRepository;
  @Mock private ParkingSpaceAssignmentRepository parkingSpaceAssignmentRepository;

  private ParkingSpaceService service;

  @BeforeEach
  void setUp() {
    service = new ParkingSpaceService(parkingSpaceRepository, parkingSpaceAssignmentRepository);
  }

  @Test
  void assignNextAvailableSpaceThrowsParkingFullWhenNoneAvailable() {
    UUID companyId = UUID.randomUUID();
    when(parkingSpaceRepository.findFirstAvailableForUpdate(companyId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.assignNextAvailableSpace(companyId, mock(ParkingSession.class)))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> {
              OperationException oe = (OperationException) ex;
              assertThat(oe.getStatus()).isEqualTo(HttpStatus.CONFLICT);
              assertThat(oe.getCode()).isEqualTo("PARKING_FULL");
            });
  }

  @Test
  void assignSpecificSpaceRejectsWhenOccupied() {
    UUID companyId = UUID.randomUUID();
    UUID spaceId = UUID.randomUUID();
    ParkingSpace space = new ParkingSpace();
    space.setId(spaceId);
    space.setCompanyId(companyId);
    space.setStatus(ParkingSpaceStatus.ACTIVE);
    when(parkingSpaceRepository.findByIdAndCompanyIdForUpdate(spaceId, companyId)).thenReturn(Optional.of(space));
    when(parkingSpaceAssignmentRepository.existsByParkingSpace_IdAndReleasedAtIsNull(spaceId)).thenReturn(true);

    assertThatThrownBy(() -> service.assignSpecificSpace(companyId, spaceId, mock(ParkingSession.class)))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getCode()).isEqualTo("PARKING_SPACE_OCCUPIED"));
  }

  @Test
  void releaseSpaceBySessionMarksAssignmentReleased() {
    UUID sessionId = UUID.randomUUID();
    ParkingSpaceAssignment assignment = new ParkingSpaceAssignment();
    assignment.setStatus(ParkingSpaceAssignmentStatus.ACTIVE);
    when(parkingSpaceAssignmentRepository.findActiveByParkingSessionId(sessionId)).thenReturn(Optional.of(assignment));
    when(parkingSpaceAssignmentRepository.save(any(ParkingSpaceAssignment.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));

    service.releaseSpaceBySession(sessionId);

    assertThat(assignment.getStatus()).isEqualTo(ParkingSpaceAssignmentStatus.RELEASED);
    assertThat(assignment.getReleasedAt()).isNotNull();
  }

  @Test
  void resizeCapacityRejectsWhenBelowOccupied() {
    UUID companyId = UUID.randomUUID();
    when(parkingSpaceRepository.findByCompanyIdOrderBySortOrderAscCodeAsc(companyId)).thenReturn(List.of());
    when(parkingSpaceAssignmentRepository.countByCompanyIdAndReleasedAtIsNull(companyId)).thenReturn(5L);

    assertThatThrownBy(() -> service.resizeCapacity(companyId, 4))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void occupancySummaryCalculatesAvailable() {
    UUID companyId = UUID.randomUUID();
    when(parkingSpaceRepository.countByCompanyId(companyId)).thenReturn(20L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.ACTIVE)).thenReturn(18L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.MAINTENANCE)).thenReturn(1L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.INACTIVE)).thenReturn(1L);
    when(parkingSpaceAssignmentRepository.countByCompanyIdAndReleasedAtIsNull(companyId)).thenReturn(10L);

    var summary = service.getOccupancySummary(companyId);

    assertThat(summary.totalSpaces()).isEqualTo(20);
    assertThat(summary.availableSpaces()).isEqualTo(8);
    assertThat(summary.occupiedSpaces()).isEqualTo(10);
  }
}
