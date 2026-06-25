package com.parkflow.modules.support.application.service;

import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.repository.TicketRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ticket Query - handles retrieval and listing of support tickets.
 * Read-only service for querying ticket state.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TicketQueryService {

    private final TicketRepository ticketRepository;

    @Transactional(readOnly = true)
    public List<Ticket> findAllByTenantId(UUID tenantId) {
        return ticketRepository.findByTenantId(tenantId);
    }

    @Transactional(readOnly = true)
    public Ticket findById(UUID id) {
        return getTicketOrThrow(id);
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private Ticket getTicketOrThrow(UUID ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found: " + ticketId));
    }
}
