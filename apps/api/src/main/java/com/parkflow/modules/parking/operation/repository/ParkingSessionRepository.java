package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, UUID> {
  List<ParkingSession> findByStatusOrderByEntryAtAsc(SessionStatus status);

  Optional<ParkingSession> findByStatusAndVehicle_Plate(SessionStatus status, String plate);

  Optional<ParkingSession> findByStatusAndTicketNumber(SessionStatus status, String ticketNumber);

  Optional<ParkingSession> findByTicketNumber(String ticketNumber);
}
