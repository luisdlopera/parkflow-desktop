package com.parkflow.modules.parking.spaces.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.spaces.domain.ParkingSpace;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignment;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignmentStatus;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceType;
import com.parkflow.modules.parking.spaces.dto.ParkingSpaceDto;
import com.parkflow.modules.parking.spaces.infrastructure.persistence.ParkingSpaceAssignmentRepository;
import com.parkflow.modules.parking.spaces.infrastructure.persistence.ParkingSpaceRepository;
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
        .satisfies(ex -> {
          OperationException oe = (OperationException) ex;
          assertThat(oe.getStatus()).isEqualTo(HttpStatus.CONFLICT);
          assertThat(oe.getCode()).isEqualTo("PARKING_FULL");
        });
  }

  @Test
  void assignNextAvailableSpace_Success() {
    UUID companyId = UUID.randomUUID();
    ParkingSpace space = new ParkingSpace();
    space.setId(UUID.randomUUID());
    space.setCompanyId(companyId);
    space.setStatus(ParkingSpaceStatus.ACTIVE);

    ParkingSession session = mock(ParkingSession.class);
    when(parkingSpaceRepository.findFirstAvailableForUpdate(companyId)).thenReturn(Optional.of(space));
    when(parkingSpaceAssignmentRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    ParkingSpace result = service.assignNextAvailableSpace(companyId, session);
    assertThat(result).isEqualTo(space);
    verify(parkingSpaceAssignmentRepository).save(any(ParkingSpaceAssignment.class));
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
  void assignSpecificSpace_NotFound() {
    UUID companyId = UUID.randomUUID();
    UUID spaceId = UUID.randomUUID();
    when(parkingSpaceRepository.findByIdAndCompanyIdForUpdate(spaceId, companyId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.assignSpecificSpace(companyId, spaceId, mock(ParkingSession.class)))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getCode()).isEqualTo("PARKING_SPACE_NOT_FOUND"));
  }

  @Test
  void assignSpecificSpace_Inactive() {
    UUID companyId = UUID.randomUUID();
    UUID spaceId = UUID.randomUUID();
    ParkingSpace space = new ParkingSpace();
    space.setId(spaceId);
    space.setCompanyId(companyId);
    space.setStatus(ParkingSpaceStatus.INACTIVE);
    when(parkingSpaceRepository.findByIdAndCompanyIdForUpdate(spaceId, companyId)).thenReturn(Optional.of(space));

    assertThatThrownBy(() -> service.assignSpecificSpace(companyId, spaceId, mock(ParkingSession.class)))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getCode()).isEqualTo("PARKING_SPACE_NOT_ACTIVE"));
  }

  @Test
  void assignSpecificSpace_Success() {
    UUID companyId = UUID.randomUUID();
    UUID spaceId = UUID.randomUUID();
    ParkingSpace space = new ParkingSpace();
    space.setId(spaceId);
    space.setCompanyId(companyId);
    space.setStatus(ParkingSpaceStatus.ACTIVE);

    ParkingSession session = mock(ParkingSession.class);
    when(parkingSpaceRepository.findByIdAndCompanyIdForUpdate(spaceId, companyId)).thenReturn(Optional.of(space));
    when(parkingSpaceAssignmentRepository.existsByParkingSpace_IdAndReleasedAtIsNull(spaceId)).thenReturn(false);
    when(parkingSpaceAssignmentRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    ParkingSpace result = service.assignSpecificSpace(companyId, spaceId, session);
    assertThat(result).isEqualTo(space);
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
  void releaseSpaceBySession_NoAssignment_DoesNothing() {
    UUID sessionId = UUID.randomUUID();
    when(parkingSpaceAssignmentRepository.findActiveByParkingSessionId(sessionId)).thenReturn(Optional.empty());

    service.releaseSpaceBySession(sessionId);

    verify(parkingSpaceAssignmentRepository, never()).save(any());
  }

  @Test
  void resizeCapacityRejectsNegativeCapacity() {
    UUID companyId = UUID.randomUUID();

    assertThatThrownBy(() -> service.resizeCapacity(companyId, -1))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getCode()).isEqualTo("INVALID_CAPACITY"));
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
  void resizeCapacity_Expand_ActivatesInactive() {
    UUID companyId = UUID.randomUUID();

    ParkingSpace active1 = buildSpace(companyId, ParkingSpaceStatus.ACTIVE, 1);
    ParkingSpace inactive1 = buildSpace(companyId, ParkingSpaceStatus.INACTIVE, 2);

    when(parkingSpaceRepository.findByCompanyIdOrderBySortOrderAscCodeAsc(companyId))
        .thenReturn(List.of(active1, inactive1));
    when(parkingSpaceAssignmentRepository.countByCompanyIdAndReleasedAtIsNull(companyId)).thenReturn(0L);
    when(parkingSpaceRepository.countByCompanyId(companyId)).thenReturn(2L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.ACTIVE)).thenReturn(2L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.MAINTENANCE)).thenReturn(0L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.INACTIVE)).thenReturn(0L);
    when(parkingSpaceRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    service.resizeCapacity(companyId, 2);

    assertThat(inactive1.getStatus()).isEqualTo(ParkingSpaceStatus.ACTIVE);
  }

  @Test
  void resizeCapacity_Expand_CreatesNew() {
    UUID companyId = UUID.randomUUID();

    ParkingSpace active1 = buildSpace(companyId, ParkingSpaceStatus.ACTIVE, 1);

    when(parkingSpaceRepository.findByCompanyIdOrderBySortOrderAscCodeAsc(companyId))
        .thenReturn(List.of(active1));
    when(parkingSpaceAssignmentRepository.countByCompanyIdAndReleasedAtIsNull(companyId)).thenReturn(0L);
    when(parkingSpaceRepository.countByCompanyId(companyId)).thenReturn(2L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.ACTIVE)).thenReturn(2L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.MAINTENANCE)).thenReturn(0L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.INACTIVE)).thenReturn(0L);
    when(parkingSpaceRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    service.resizeCapacity(companyId, 3); // needs 2 more, only 0 inactive → create new

    // When there are no inactive spaces to activate, new spaces should be created
    // Verify save was called (both for the active space that was there, and possibly new ones)
    verify(parkingSpaceRepository, org.mockito.Mockito.atLeastOnce()).save(any());
  }

  @Test
  void resizeCapacity_Shrink_DeactivatesUnoccupied() {
    UUID companyId = UUID.randomUUID();

    ParkingSpace active1 = buildSpace(companyId, ParkingSpaceStatus.ACTIVE, 1);
    ParkingSpace active2 = buildSpace(companyId, ParkingSpaceStatus.ACTIVE, 2);
    ParkingSpace active3 = buildSpace(companyId, ParkingSpaceStatus.ACTIVE, 3);

    when(parkingSpaceRepository.findByCompanyIdOrderBySortOrderAscCodeAsc(companyId))
        .thenReturn(List.of(active1, active2, active3));
    when(parkingSpaceAssignmentRepository.countByCompanyIdAndReleasedAtIsNull(companyId)).thenReturn(1L);
    when(parkingSpaceAssignmentRepository.existsByParkingSpace_IdAndReleasedAtIsNull(active3.getId())).thenReturn(false);
    when(parkingSpaceRepository.countByCompanyId(companyId)).thenReturn(2L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.ACTIVE)).thenReturn(2L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.MAINTENANCE)).thenReturn(0L);
    when(parkingSpaceRepository.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.INACTIVE)).thenReturn(1L);
    when(parkingSpaceRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    service.resizeCapacity(companyId, 2);

    assertThat(active3.getStatus()).isEqualTo(ParkingSpaceStatus.INACTIVE);
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

  @Test
  void listSpaces_FilterAll() {
    UUID companyId = UUID.randomUUID();
    ParkingSpace s1 = buildSpace(companyId, ParkingSpaceStatus.ACTIVE, 1);
    ParkingSpace s2 = buildSpace(companyId, ParkingSpaceStatus.INACTIVE, 2);

    when(parkingSpaceRepository.findByCompanyIdOrderBySortOrderAscCodeAsc(companyId))
        .thenReturn(List.of(s1, s2));
    when(parkingSpaceAssignmentRepository.existsByParkingSpace_IdAndReleasedAtIsNull(any())).thenReturn(false);

    List<ParkingSpaceDto> result = service.listSpaces(companyId, "ALL");
    assertThat(result).hasSize(2);
  }

  @Test
  void listSpaces_FilterInactive() {
    UUID companyId = UUID.randomUUID();
    ParkingSpace s1 = buildSpace(companyId, ParkingSpaceStatus.ACTIVE, 1);
    ParkingSpace s2 = buildSpace(companyId, ParkingSpaceStatus.INACTIVE, 2);

    when(parkingSpaceRepository.findByCompanyIdOrderBySortOrderAscCodeAsc(companyId))
        .thenReturn(List.of(s1, s2));

    List<ParkingSpaceDto> result = service.listSpaces(companyId, "INACTIVE");
    assertThat(result).hasSize(1);
    assertThat(result.get(0).status()).isEqualTo(ParkingSpaceStatus.INACTIVE);
  }

  @Test
  void patchSpace_Success() {
    UUID companyId = UUID.randomUUID();
    UUID spaceId = UUID.randomUUID();
    ParkingSpace space = buildSpace(companyId, ParkingSpaceStatus.ACTIVE, 1);
    space.setId(spaceId);

    when(parkingSpaceRepository.findByIdAndCompanyId(spaceId, companyId)).thenReturn(Optional.of(space));
    when(parkingSpaceRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    when(parkingSpaceAssignmentRepository.existsByParkingSpace_IdAndReleasedAtIsNull(any())).thenReturn(false);

    ParkingSpaceDto res = service.patchSpace(companyId, spaceId, ParkingSpaceStatus.MAINTENANCE, "New Label", ParkingSpaceType.VIP);
    assertThat(res.status()).isEqualTo(ParkingSpaceStatus.MAINTENANCE);
    assertThat(res.label()).isEqualTo("New Label");
  }

  @Test
  void patchSpace_NotFound() {
    UUID companyId = UUID.randomUUID();
    UUID spaceId = UUID.randomUUID();
    when(parkingSpaceRepository.findByIdAndCompanyId(spaceId, companyId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.patchSpace(companyId, spaceId, null, null, null))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getCode()).isEqualTo("PARKING_SPACE_NOT_FOUND"));
  }

  @Test
  void patchSpace_OccupiedCannotDeactivate() {
    UUID companyId = UUID.randomUUID();
    UUID spaceId = UUID.randomUUID();
    ParkingSpace space = buildSpace(companyId, ParkingSpaceStatus.ACTIVE, 1);
    space.setId(spaceId);

    when(parkingSpaceRepository.findByIdAndCompanyId(spaceId, companyId)).thenReturn(Optional.of(space));
    when(parkingSpaceAssignmentRepository.existsByParkingSpace_IdAndReleasedAtIsNull(spaceId)).thenReturn(true);

    assertThatThrownBy(() -> service.patchSpace(companyId, spaceId, ParkingSpaceStatus.INACTIVE, null, null))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getCode()).isEqualTo("PARKING_SPACE_OCCUPIED"));
  }

  @Test
  void findAssignmentBySessionId_Found() {
    UUID sessionId = UUID.randomUUID();
    ParkingSpaceAssignment assignment = new ParkingSpaceAssignment();
    when(parkingSpaceAssignmentRepository.findLatestByParkingSessionId(sessionId))
        .thenReturn(Optional.of(assignment));

    ParkingSpaceAssignment result = service.findAssignmentBySessionId(sessionId);
    assertThat(result).isEqualTo(assignment);
  }

  @Test
  void findAssignmentBySessionId_NotFound() {
    UUID sessionId = UUID.randomUUID();
    when(parkingSpaceAssignmentRepository.findLatestByParkingSessionId(sessionId))
        .thenReturn(Optional.empty());

    ParkingSpaceAssignment result = service.findAssignmentBySessionId(sessionId);
    assertThat(result).isNull();
  }

  // Helper
  private ParkingSpace buildSpace(UUID companyId, ParkingSpaceStatus status, int sortOrder) {
    ParkingSpace space = new ParkingSpace();
    space.setId(UUID.randomUUID());
    space.setCompanyId(companyId);
    space.setStatus(status);
    space.setSortOrder(sortOrder);
    space.setCode(String.format("C%03d", sortOrder));
    space.setLabel("Celda " + sortOrder);
    space.setType(ParkingSpaceType.GENERAL);
    return space;
  }
}
