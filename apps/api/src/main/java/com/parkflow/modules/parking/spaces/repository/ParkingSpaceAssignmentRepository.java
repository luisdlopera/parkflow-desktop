package com.parkflow.modules.parking.spaces.repository;

import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignment;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignmentStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ParkingSpaceAssignmentRepository extends JpaRepository<ParkingSpaceAssignment, UUID> {
  @Query(
      "SELECT psa FROM ParkingSpaceAssignment psa "
          + "JOIN FETCH psa.parkingSpace ps "
          + "WHERE psa.parkingSession.id = :sessionId AND psa.releasedAt IS NULL")
  Optional<ParkingSpaceAssignment> findActiveByParkingSessionId(@Param("sessionId") UUID sessionId);

  @Query(
      "SELECT psa FROM ParkingSpaceAssignment psa "
          + "JOIN FETCH psa.parkingSpace ps "
          + "WHERE psa.parkingSession.id = :sessionId")
  Optional<ParkingSpaceAssignment> findLatestByParkingSessionId(@Param("sessionId") UUID sessionId);

  @Query(
      "SELECT psa FROM ParkingSpaceAssignment psa "
          + "JOIN FETCH psa.parkingSession s "
          + "WHERE psa.parkingSpace.id = :parkingSpaceId AND psa.releasedAt IS NULL")
  Optional<ParkingSpaceAssignment> findActiveByParkingSpaceId(@Param("parkingSpaceId") UUID parkingSpaceId);

  boolean existsByParkingSpace_IdAndReleasedAtIsNull(UUID parkingSpaceId);

  long countByCompanyIdAndReleasedAtIsNull(UUID companyId);

  long countByCompanyIdAndStatusAndReleasedAtIsNull(
      UUID companyId, ParkingSpaceAssignmentStatus status);
}
