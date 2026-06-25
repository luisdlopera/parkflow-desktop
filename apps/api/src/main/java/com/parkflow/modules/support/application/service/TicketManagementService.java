package com.parkflow.modules.support.application.service;

import com.parkflow.modules.support.application.dto.CreateTicketRequest;
import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import com.parkflow.modules.support.domain.repository.TicketRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ticket Management - handles creation, assignment, status updates, and messaging.
 * Manages the lifecycle of support tickets.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TicketManagementService {

    private final TicketRepository ticketRepository;

    @Transactional
    public Ticket createTicket(CreateTicketRequest request) {
        log.info("Creating new ticket for customer: {}", request.customerId());
        Ticket ticket = new Ticket();
        ticket.setTicketNumber(generateTicketNumber());
        ticket.setTitle(request.title());
        ticket.setDescription(request.description());
        ticket.setPriority(request.priority());
        ticket.setCategory(request.category());
        ticket.setChannel(request.channel());
        ticket.setCustomerId(request.customerId());
        ticket.setTenantId(request.tenantId());

        return ticketRepository.save(ticket);
    }

    @Transactional
    public Ticket assignTicket(UUID ticketId, UUID agentId) {
        Ticket ticket = getTicketOrThrow(ticketId);
        ticket.setAssignedAgentId(agentId);
        if (ticket.getStatus() == TicketStatus.OPEN) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }
        return ticketRepository.save(ticket);
    }

    @Transactional
    public Ticket updateStatus(UUID ticketId, TicketStatus newStatus) {
        Ticket ticket = getTicketOrThrow(ticketId);
        ticket.setStatus(newStatus);
        if (newStatus == TicketStatus.CLOSED || newStatus == TicketStatus.RESOLVED || newStatus == TicketStatus.CANCELLED) {
            ticket.setClosedAt(OffsetDateTime.now());
        }
        return ticketRepository.save(ticket);
    }

    @Transactional
    public void addMessageToTicket(UUID ticketId, String content) {
        Ticket ticket = getTicketOrThrow(ticketId);
        // Note: Full implementation would use ConversationRepository and MessageRepository
        log.info("Adding message to ticket {}: {}", ticketId, content);
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private Ticket getTicketOrThrow(UUID ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found: " + ticketId));
    }

    private String generateTicketNumber() {
        return "TK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
