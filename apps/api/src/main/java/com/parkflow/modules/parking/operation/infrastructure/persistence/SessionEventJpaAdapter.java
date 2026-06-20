package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.modules.parking.operation.domain.SessionEvent;
import com.parkflow.modules.parking.operation.domain.SessionEventType;
import com.parkflow.modules.parking.operation.domain.repository.SessionEventPort;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

@Component
@RequiredArgsConstructor
public class SessionEventJpaAdapter implements SessionEventPort {

  private final SessionEventJpaRepository jpaRepository;

  @Override
  public SessionEvent save(SessionEvent event) {
    return jpaRepository.save(event);
  }

  @Override
  public List<SessionEvent> findReprintEventsByTicketNumber(String ticketNumber, UUID companyId) {
    return jpaRepository.findByTypeAndSessionTicketNumberAndSessionCompanyIdOrderByCreatedAtDesc(
        SessionEventType.TICKET_REPRINTED, ticketNumber, companyId);
  }

  @Repository
  interface SessionEventJpaRepository extends JpaRepository<SessionEvent, UUID> {

    @Query("SELECT e FROM SessionEvent e LEFT JOIN FETCH e.actorUser WHERE e.type = :type AND e.session.ticketNumber = :ticketNumber AND e.session.companyId = :companyId ORDER BY e.createdAt DESC")
    List<SessionEvent> findByTypeAndSessionTicketNumberAndSessionCompanyIdOrderByCreatedAtDesc(
        @Param("type") SessionEventType type,
        @Param("ticketNumber") String ticketNumber,
        @Param("companyId") UUID companyId);
  }
}
