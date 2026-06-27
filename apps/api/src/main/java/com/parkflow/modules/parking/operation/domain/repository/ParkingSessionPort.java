package com.parkflow.modules.parking.operation.domain.repository;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface ParkingSessionPort {
  long countByStatusAndCompanyId(SessionStatus status, UUID companyId);
  long countByStatusAndCompanyIdAndEntryAtGreaterThanEqual(SessionStatus status, UUID companyId, OffsetDateTime entryAt);
  long countByRate_IdAndCompanyId(UUID rateId, UUID companyId);
  default long countByRate_Id(UUID rateId) {
    return countByRate_IdAndCompanyId(rateId, null);
  }
  org.springframework.data.domain.Page<ParkingSession> findActiveWithAssociations(SessionStatus status, UUID companyId, Pageable pageable);

  default org.springframework.data.domain.Page<ParkingSession> findActiveWithAssociations(SessionStatus status, UUID companyId) {
    return findActiveWithAssociations(status, companyId, org.springframework.data.domain.PageRequest.of(0, 1000));
  }
  Optional<ParkingSession> findByStatusAndVehicle_PlateAndCompanyId(SessionStatus status, String plate, UUID companyId);
  Optional<ParkingSession> findByStatusAndTicketNumberAndCompanyId(SessionStatus status, String ticketNumber, UUID companyId);
  Optional<ParkingSession> findByTicketNumberAndCompanyId(String ticketNumber, UUID companyId);
  Optional<ParkingSession> findActiveByTicketForUpdate(SessionStatus status, String ticket, UUID companyId);
  Optional<ParkingSession> findActiveByPlateForUpdate(SessionStatus status, String plate, UUID companyId);
  Optional<ParkingSession> findByTicketNumberForUpdate(String ticket, UUID companyId);
  long countActive(UUID companyId);
  default long countActive() {
    return countActive(null);
  }
  long countEntriesInPeriod(OffsetDateTime start, OffsetDateTime end, UUID companyId);
  default long countEntriesInPeriod(OffsetDateTime start, OffsetDateTime end) {
    return countEntriesInPeriod(start, end, null);
  }
  long countExitsInPeriod(OffsetDateTime start, OffsetDateTime end, UUID companyId);
  default long countExitsInPeriod(OffsetDateTime start, OffsetDateTime end) {
    return countExitsInPeriod(start, end, null);
  }
  long countReprintsInPeriod(OffsetDateTime start, OffsetDateTime end, UUID companyId);
  default long countReprintsInPeriod(OffsetDateTime start, OffsetDateTime end) {
    return countReprintsInPeriod(start, end, null);
  }
  long countReprintsByOperatorInPeriod(OffsetDateTime start, OffsetDateTime end, UUID operatorId, UUID companyId);
  long countLostTicketsInPeriod(OffsetDateTime start, OffsetDateTime end, UUID companyId);
  default long countLostTicketsInPeriod(OffsetDateTime start, OffsetDateTime end) {
    return countLostTicketsInPeriod(start, end, null);
  }
  long countSyncPending(UUID companyId);

  org.springframework.data.domain.Page<ParkingSession> searchByPlateOrTicket(String query, UUID companyId, Pageable pageable);
  org.springframework.data.domain.Page<ParkingSession> searchActiveByPlateOrTicket(String query, UUID companyId, Pageable pageable);
  
  ParkingSession save(ParkingSession session);
  Optional<ParkingSession> findById(UUID id);
  void delete(ParkingSession session);
}
