package com.parkflow.modules.support.application.service;

import com.parkflow.modules.support.application.dto.CreateTicketRequest;
import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.Channel;
import com.parkflow.modules.support.domain.enums.TicketCategory;
import com.parkflow.modules.support.domain.enums.TicketPriority;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import com.parkflow.modules.support.domain.repository.TicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @InjectMocks
    private TicketService ticketService;

    private UUID customerId;
    private UUID tenantId;

    @BeforeEach
    void setUp() {
        customerId = UUID.randomUUID();
        tenantId = UUID.randomUUID();
    }

    @Test
    void createTicket_success() {
        CreateTicketRequest request = new CreateTicketRequest(
                "Test ticket",
                "Description",
                TicketPriority.HIGH,
                TicketCategory.TECHNICAL_SUPPORT,
                Channel.WHATSAPP,
                customerId,
                tenantId
        );

        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Ticket result = ticketService.createTicket(request);

        assertNotNull(result);
        assertEquals(TicketStatus.OPEN, result.getStatus());
        assertEquals("Test ticket", result.getTitle());
        assertTrue(result.getTicketNumber().startsWith("TK-"));
        
        verify(ticketRepository).save(any(Ticket.class));
    }

    @Test
    void assignTicket_success() {
        UUID ticketId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();
        Ticket ticket = new Ticket();
        ticket.setStatus(TicketStatus.OPEN);

        when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(i -> i.getArgument(0));

        Ticket result = ticketService.assignTicket(ticketId, agentId);

        assertEquals(agentId, result.getAssignedAgentId());
        assertEquals(TicketStatus.IN_PROGRESS, result.getStatus());
    }

    @Test
    void updateStatus_toClosed_setsClosedAt() {
        UUID ticketId = UUID.randomUUID();
        Ticket ticket = new Ticket();
        ticket.setStatus(TicketStatus.IN_PROGRESS);

        when(ticketRepository.findById(ticketId)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(i -> i.getArgument(0));

        Ticket result = ticketService.updateStatus(ticketId, TicketStatus.CLOSED);

        assertEquals(TicketStatus.CLOSED, result.getStatus());
        assertNotNull(result.getClosedAt());
    }
}
