package com.parkflow.modules.support.infrastructure.repository;

import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketJpaRepository extends JpaRepository<Ticket, UUID> {
    Optional<Ticket> findByTicketNumber(String ticketNumber);
    List<Ticket> findByCustomerIdAndStatus(UUID customerId, TicketStatus status);
    List<Ticket> findByTenantId(UUID tenantId);
}
