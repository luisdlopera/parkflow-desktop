package com.parkflow.modules.support.domain.repository;

import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TicketRepository {

    Ticket save(Ticket ticket);

    Optional<Ticket> findById(UUID id);

    Optional<Ticket> findByTicketNumber(String ticketNumber);

    List<Ticket> findByCustomerIdAndStatus(UUID customerId, TicketStatus status);

    List<Ticket> findByTenantId(UUID tenantId);
}
