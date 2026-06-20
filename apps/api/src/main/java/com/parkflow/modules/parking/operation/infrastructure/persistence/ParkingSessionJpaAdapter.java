package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionEvent;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ParkingSessionJpaAdapter implements ParkingSessionPort {

  private final ParkingSessionJpaRepository jpaRepository;

  @Override
  public long countByStatusAndCompanyId(SessionStatus status, UUID companyId) {
    return jpaRepository.countByStatusAndCompanyId(status, companyId);
  }

  @Override
  public long countByStatusAndSiteAndCompanyId(SessionStatus status, String site, UUID companyId) {
    return jpaRepository.countByStatusAndSiteAndCompanyId(status, site, companyId);
  }

  @Override
  public long countByRate_IdAndCompanyId(UUID rateId, UUID companyId) {
    return jpaRepository.countByRate_IdAndCompanyId(rateId, companyId);
  }

  @Override
  public org.springframework.data.domain.Page<ParkingSession> findActiveWithAssociations(SessionStatus status, UUID companyId, Pageable pageable) {
    return jpaRepository.findActiveWithAssociations(status, companyId, pageable);
  }

  @Override
  public Optional<ParkingSession> findByStatusAndVehicle_PlateAndCompanyId(SessionStatus status, String plate, UUID companyId) {
    return jpaRepository.findByStatusAndVehicle_PlateAndCompanyId(status, plate, companyId);
  }

  @Override
  public Optional<ParkingSession> findByStatusAndTicketNumberAndCompanyId(SessionStatus status, String ticketNumber, UUID companyId) {
    return jpaRepository.findByStatusAndTicketNumberAndCompanyId(status, ticketNumber, companyId);
  }

  @Override
  public Optional<ParkingSession> findByTicketNumberAndCompanyId(String ticketNumber, UUID companyId) {
    return jpaRepository.findByTicketNumberAndCompanyId(ticketNumber, companyId);
  }

  @Override
  public Optional<ParkingSession> findActiveByTicketForUpdate(SessionStatus status, String ticket, UUID companyId) {
    return jpaRepository.findActiveByTicketForUpdate(status, ticket, companyId);
  }

  @Override
  public Optional<ParkingSession> findActiveByPlateForUpdate(SessionStatus status, String plate, UUID companyId) {
    return jpaRepository.findActiveByPlateForUpdate(status, plate, companyId);
  }

  @Override
  public Optional<ParkingSession> findByTicketNumberForUpdate(String ticket, UUID companyId) {
    return jpaRepository.findByTicketNumberForUpdate(ticket, companyId);
  }

  @Override
  public long countActive(UUID companyId) {
    return jpaRepository.countActive(companyId);
  }

  @Override
  public long countEntriesInPeriod(OffsetDateTime start, OffsetDateTime end, UUID companyId) {
    return jpaRepository.countEntriesInPeriod(start, end, companyId);
  }

  @Override
  public long countExitsInPeriod(OffsetDateTime start, OffsetDateTime end, UUID companyId) {
    return jpaRepository.countExitsInPeriod(start, end, companyId);
  }

  @Override
  public long countReprintsInPeriod(OffsetDateTime start, OffsetDateTime end, UUID companyId) {
    return jpaRepository.countReprintsInPeriod(start, end, companyId);
  }

  @Override
  public long countReprintsByOperatorInPeriod(OffsetDateTime start, OffsetDateTime end, UUID operatorId, UUID companyId) {
    return jpaRepository.countReprintsByOperatorInPeriod(start, end, operatorId, companyId);
  }

  @Override
  public long countLostTicketsInPeriod(OffsetDateTime start, OffsetDateTime end, UUID companyId) {
    return jpaRepository.countLostTicketsInPeriod(start, end, companyId);
  }

  @Override
  public long countSyncPending(UUID companyId) {
    return jpaRepository.countSyncPending(companyId);
  }

  @Override
  public org.springframework.data.domain.Page<ParkingSession> searchByPlateOrTicket(String query, UUID companyId, Pageable pageable) {
    return jpaRepository.searchByPlateOrTicket(query, companyId, pageable);
  }

  @Override
  public org.springframework.data.domain.Page<ParkingSession> searchActiveByPlateOrTicket(String query, UUID companyId, Pageable pageable) {
    return jpaRepository.searchActiveByPlateOrTicket(query, companyId, pageable);
  }

  @Override
  public ParkingSession save(ParkingSession session) {
    return jpaRepository.save(session);
  }

  @Override
  public Optional<ParkingSession> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public void delete(ParkingSession session) {
    jpaRepository.delete(session);
  }

  @Repository
  interface ParkingSessionJpaRepository extends JpaRepository<ParkingSession, UUID> {
    long countByStatusAndCompanyId(SessionStatus status, UUID companyId);
    long countByStatusAndSiteAndCompanyId(SessionStatus status, String site, UUID companyId);
    long countByRate_IdAndCompanyId(UUID rateId, UUID companyId);

    @Query(
        value = "SELECT s FROM ParkingSession s JOIN FETCH s.vehicle v LEFT JOIN FETCH s.rate r WHERE s.status = :status AND s.companyId = :cid",
        countQuery = "SELECT COUNT(s) FROM ParkingSession s WHERE s.status = :status AND s.companyId = :cid"
    )
    org.springframework.data.domain.Page<ParkingSession> findActiveWithAssociations(@Param("status") SessionStatus status, @Param("cid") UUID companyId, Pageable pageable);

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

    @Query("SELECT COUNT(e) FROM SessionEvent e WHERE e.type = 'TICKET_REPRINTED' AND e.actorUser.id = :opId AND e.createdAt >= :start AND e.createdAt < :end AND e.session.companyId = :cid")
    long countReprintsByOperatorInPeriod(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end, @Param("opId") UUID operatorId, @Param("cid") UUID companyId);

    @Query("SELECT COUNT(s) FROM ParkingSession s WHERE s.createdAt >= :start AND s.createdAt < :end AND s.status = 'LOST_TICKET' AND s.companyId = :cid")
    long countLostTicketsInPeriod(@Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end, @Param("cid") UUID companyId);

    @Query("SELECT COUNT(s) FROM ParkingSession s WHERE s.syncStatus = 'PENDING' AND s.companyId = :cid")
    long countSyncPending(@Param("cid") UUID companyId);

    @Query(
        value = "SELECT s FROM ParkingSession s JOIN FETCH s.vehicle v LEFT JOIN FETCH s.rate r " +
                "WHERE (LOWER(v.plate) LIKE LOWER(CONCAT('%', :q, '%')) " +
                "OR LOWER(s.ticketNumber) LIKE LOWER(CONCAT('%', :q, '%'))) " +
                "AND s.companyId = :cid",
        countQuery = "SELECT COUNT(s) FROM ParkingSession s JOIN s.vehicle v " +
                     "WHERE (LOWER(v.plate) LIKE LOWER(CONCAT('%', :q, '%')) " +
                     "OR LOWER(s.ticketNumber) LIKE LOWER(CONCAT('%', :q, '%'))) " +
                     "AND s.companyId = :cid"
    )
    org.springframework.data.domain.Page<ParkingSession> searchByPlateOrTicket(@Param("q") String query, @Param("cid") UUID companyId, Pageable pageable);

    @Query(
        value = "SELECT s FROM ParkingSession s JOIN FETCH s.vehicle v LEFT JOIN FETCH s.rate r " +
                "WHERE (LOWER(v.plate) LIKE LOWER(CONCAT('%', :q, '%')) " +
                "OR LOWER(s.ticketNumber) LIKE LOWER(CONCAT('%', :q, '%'))) " +
                "AND s.status = 'ACTIVE' " +
                "AND s.companyId = :cid",
        countQuery = "SELECT COUNT(s) FROM ParkingSession s JOIN s.vehicle v " +
                     "WHERE (LOWER(v.plate) LIKE LOWER(CONCAT('%', :q, '%')) " +
                     "OR LOWER(s.ticketNumber) LIKE LOWER(CONCAT('%', :q, '%'))) " +
                     "AND s.status = 'ACTIVE' " +
                     "AND s.companyId = :cid"
    )
    org.springframework.data.domain.Page<ParkingSession> searchActiveByPlateOrTicket(@Param("q") String query, @Param("cid") UUID companyId, Pageable pageable);
  }
}
