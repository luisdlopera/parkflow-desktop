package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.auth.security.TenantContext;
import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, UUID> {
  
  // -- Primitive methods (require explicit companyId) --

  long countByStatusAndCompanyId(SessionStatus status, UUID companyId);

  long countByStatusAndSiteAndCompanyId(SessionStatus status, String site, UUID companyId);

  long countByRate_IdAndCompanyId(UUID rateId, UUID companyId);

  @Query("SELECT s FROM ParkingSession s JOIN FETCH s.vehicle v LEFT JOIN FETCH s.rate r " +
         "WHERE s.status = :status AND s.companyId = :cid ORDER BY s.entryAt ASC")
  List<ParkingSession> findActiveWithAssociations(@Param("status") SessionStatus status, @Param("cid") UUID companyId, Pageable pageable);

  default List<ParkingSession> findActiveWithAssociations(SessionStatus status, UUID companyId) {
    return findActiveWithAssociations(status, companyId, Pageable.ofSize(1000));
  }

  Optional<ParkingSession> findByStatusAndVehicle_PlateAndCompanyId(SessionStatus status, String plate, UUID companyId);

  Optional<ParkingSession> findByStatusAndTicketNumberAndCompanyId(SessionStatus status, String ticketNumber, UUID companyId);

  Optional<ParkingSession> findByTicketNumberAndCompanyId(String ticketNumber, UUID companyId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM ParkingSession s JOIN FETCH s.vehicle v " +
         "WHERE s.status = :st AND s.ticketNumber = :ticket AND s.companyId = :cid")
  Optional<ParkingSession> findActiveByTicketForUpdate(
      @Param("st") SessionStatus status, @Param("ticket") String ticket, @Param("cid") UUID companyId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM ParkingSession s JOIN FETCH s.vehicle v " +
         "WHERE s.status = :st AND v.plate = :plate AND s.companyId = :cid")
  Optional<ParkingSession> findActiveByPlateForUpdate(
      @Param("st") SessionStatus status, @Param("plate") String plate, @Param("cid") UUID companyId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM ParkingSession s JOIN FETCH s.vehicle v WHERE s.ticketNumber = :ticket AND s.companyId = :cid")
  Optional<ParkingSession> findByTicketNumberForUpdate(@Param("ticket") String ticket, @Param("cid") UUID companyId);

  @Query("SELECT COUNT(s) FROM ParkingSession s WHERE s.status = 'ACTIVE' AND s.companyId = :cid")
  long countActive(@Param("cid") UUID companyId);

  @Query("SELECT COUNT(s) FROM ParkingSession s WHERE s.entryAt >= :start AND s.entryAt < :end AND s.companyId = :cid")
  long countEntriesInPeriod(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end, @Param("cid") UUID companyId);

  @Query("SELECT COUNT(s) FROM ParkingSession s WHERE s.exitAt >= :start AND s.exitAt < :end AND s.status = 'CLOSED' AND s.companyId = :cid")
  long countExitsInPeriod(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end, @Param("cid") UUID companyId);

  @Query("SELECT COUNT(s) FROM ParkingSession s WHERE s.createdAt >= :start AND s.createdAt < :end AND s.reprintCount > 0 AND s.companyId = :cid")
  long countReprintsInPeriod(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end, @Param("cid") UUID companyId);

  @Query("SELECT COUNT(s) FROM ParkingSession s WHERE s.createdAt >= :start AND s.createdAt < :end AND s.status = 'LOST_TICKET' AND s.companyId = :cid")
  long countLostTicketsInPeriod(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end, @Param("cid") UUID companyId);

  @Query("SELECT COUNT(s) FROM ParkingSession s WHERE s.syncStatus = 'PENDING' AND s.companyId = :cid")
  long countSyncPending(@Param("cid") UUID companyId);

  // -- Default methods (use TenantContext) --

  default long countActive() {
    return countActive(TenantContext.getTenantId());
  }

  default long countEntriesInPeriod(OffsetDateTime start, OffsetDateTime end) {
    return countEntriesInPeriod(start, end, TenantContext.getTenantId());
  }

  default long countExitsInPeriod(OffsetDateTime start, OffsetDateTime end) {
    return countExitsInPeriod(start, end, TenantContext.getTenantId());
  }

  default long countReprintsInPeriod(OffsetDateTime start, OffsetDateTime end) {
    return countReprintsInPeriod(start, end, TenantContext.getTenantId());
  }

  default long countLostTicketsInPeriod(OffsetDateTime start, OffsetDateTime end) {
    return countLostTicketsInPeriod(start, end, TenantContext.getTenantId());
  }

  default List<ParkingSession> findActiveWithAssociations(SessionStatus status) {
    return findActiveWithAssociations(status, TenantContext.getTenantId());
  }

  default Optional<ParkingSession> findByStatusAndVehicle_Plate(SessionStatus status, String plate) {
    return findByStatusAndVehicle_PlateAndCompanyId(status, plate, TenantContext.getTenantId());
  }

  default Optional<ParkingSession> findByStatusAndTicketNumber(SessionStatus status, String ticketNumber) {
    return findByStatusAndTicketNumberAndCompanyId(status, ticketNumber, TenantContext.getTenantId());
  }

  default Optional<ParkingSession> findByTicketNumber(String ticketNumber) {
    return findByTicketNumberAndCompanyId(ticketNumber, TenantContext.getTenantId());
  }

  default Optional<ParkingSession> findActiveByTicketForUpdate(SessionStatus status, String ticket) {
    return findActiveByTicketForUpdate(status, ticket, TenantContext.getTenantId());
  }

  default Optional<ParkingSession> findActiveByPlateForUpdate(SessionStatus status, String plate) {
    return findActiveByPlateForUpdate(status, plate, TenantContext.getTenantId());
  }

  default long countByStatusAndSite(SessionStatus status, String site) {
    return countByStatusAndSiteAndCompanyId(status, site, TenantContext.getTenantId());
  }

  default Optional<ParkingSession> findByTicketNumberForUpdate(String ticketNumber) {
    return findByTicketNumberForUpdate(ticketNumber, TenantContext.getTenantId());
  }

  default long countByRate_Id(UUID rateId) {
    return countByRate_IdAndCompanyId(rateId, TenantContext.getTenantId());
  }
}
