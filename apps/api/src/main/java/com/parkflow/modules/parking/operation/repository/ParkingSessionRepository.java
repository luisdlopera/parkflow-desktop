package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, UUID> {
  long countByStatus(SessionStatus status);

  long countByRate_Id(UUID rateId);

  List<ParkingSession> findByStatusOrderByEntryAtAsc(SessionStatus status);

  Optional<ParkingSession> findByStatusAndVehicle_Plate(SessionStatus status, String plate);

  Optional<ParkingSession> findByStatusAndTicketNumber(SessionStatus status, String ticketNumber);

  Optional<ParkingSession> findByTicketNumber(String ticketNumber);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "SELECT s FROM ParkingSession s JOIN FETCH s.vehicle v "
          + "WHERE s.status = :st AND s.ticketNumber = :ticket")
  Optional<ParkingSession> findActiveByTicketForUpdate(
      @Param("st") SessionStatus status, @Param("ticket") String ticket);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM ParkingSession s JOIN FETCH s.vehicle v WHERE s.status = :st AND v.plate = :plate")
  Optional<ParkingSession> findActiveByPlateForUpdate(
      @Param("st") SessionStatus status, @Param("plate") String plate);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM ParkingSession s JOIN FETCH s.vehicle v WHERE s.ticketNumber = :ticket")
  Optional<ParkingSession> findByTicketNumberForUpdate(@Param("ticket") String ticket);
}
