package com.parkflow.modules.support.infrastructure.repository;

import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import com.parkflow.modules.support.domain.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class TicketRepositoryAdapter implements TicketRepository {

    private final TicketJpaRepository jpaRepository;

    @Override
    public Ticket save(Ticket ticket) {
        return jpaRepository.save(ticket);
    }

    @Override
    public Optional<Ticket> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<Ticket> findByTicketNumber(String ticketNumber) {
        return jpaRepository.findByTicketNumber(ticketNumber);
    }

    @Override
    public List<Ticket> findByCustomerIdAndStatus(UUID customerId, TicketStatus status) {
        return jpaRepository.findByCustomerIdAndStatus(customerId, status);
    }

    @Override
    public List<Ticket> findByTenantId(UUID tenantId) {
        return jpaRepository.findByTenantId(tenantId);
    }
}
