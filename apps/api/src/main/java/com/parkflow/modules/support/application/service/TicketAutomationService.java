package com.parkflow.modules.support.application.service;

import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketPriority;
import com.parkflow.modules.support.domain.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TicketAutomationService {

    private final TicketRepository ticketRepository;

    @Transactional
    public void autoAssignTicket(UUID ticketId) {
        log.info("Running auto-assignment for ticket {}", ticketId);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
                
        // Dummy logic for assignment
        // E.g., fetch available agents from tenant and assign
        ticket.setAssignedAgentId(UUID.randomUUID());
        ticketRepository.save(ticket);
    }

    @Transactional
    public void escalateTicket(UUID ticketId) {
        log.info("Escalating ticket {}", ticketId);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        
        if (ticket.getPriority() != TicketPriority.CRITICAL) {
            ticket.setPriority(TicketPriority.CRITICAL);
            ticketRepository.save(ticket);
        }
    }
}
