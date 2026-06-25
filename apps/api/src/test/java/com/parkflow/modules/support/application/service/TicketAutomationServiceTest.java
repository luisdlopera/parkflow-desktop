package com.parkflow.modules.support.application.service;

import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketPriority;
import com.parkflow.modules.support.domain.repository.TicketRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketAutomationServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @InjectMocks
    private TicketAutomationService automationService;

    @Test
    void autoAssignTicket_success() {
        UUID ticketId = UUID.randomUUID();
        Ticket ticket = new Ticket();
        when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

        automationService.autoAssignTicket(ticketId);

        assertNotNull(ticket.getAssignedAgentId());
        verify(ticketRepository).save(ticket);
    }

    @Test
    void escalateTicket_notCritical_escalatesToCritical() {
        UUID ticketId = UUID.randomUUID();
        Ticket ticket = new Ticket();
        ticket.setPriority(TicketPriority.HIGH);
        
        when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));

        automationService.escalateTicket(ticketId);

        assertEquals(TicketPriority.CRITICAL, ticket.getPriority());
        verify(ticketRepository).save(ticket);
    }
}
