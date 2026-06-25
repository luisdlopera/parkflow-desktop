package com.parkflow.modules.support.infrastructure.web;

import com.parkflow.modules.support.application.dto.CreateTicketRequest;
import com.parkflow.modules.support.application.service.TicketService;
import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.Channel;
import com.parkflow.modules.support.domain.enums.TicketCategory;
import com.parkflow.modules.support.domain.enums.TicketPriority;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupportControllerTest {

    @Mock
    private TicketService ticketService;

    @InjectMocks
    private SupportController controller;

    @Test
    void createTicket() {
        CreateTicketRequest req = new CreateTicketRequest("T", "D", TicketPriority.LOW, TicketCategory.OTHER, Channel.WEB_CHAT, UUID.randomUUID(), UUID.randomUUID());
        Ticket t = new Ticket();
        when(ticketService.createTicket(any())).thenReturn(t);

        ResponseEntity<Ticket> res = controller.createTicket(req);
        assertEquals(200, res.getStatusCode().value());
        assertEquals(t, res.getBody());
    }

    @Test
    void assignTicket() {
        UUID id = UUID.randomUUID();
        UUID agent = UUID.randomUUID();
        Ticket t = new Ticket();
        when(ticketService.assignTicket(id, agent)).thenReturn(t);

        ResponseEntity<Ticket> res = controller.assignTicket(id, agent);
        assertEquals(200, res.getStatusCode().value());
        assertEquals(t, res.getBody());
    }

    @Test
    void updateStatus() {
        UUID id = UUID.randomUUID();
        Ticket t = new Ticket();
        when(ticketService.updateStatus(id, TicketStatus.CLOSED)).thenReturn(t);

        ResponseEntity<Ticket> res = controller.updateStatus(id, TicketStatus.CLOSED);
        assertEquals(200, res.getStatusCode().value());
        assertEquals(t, res.getBody());
    }

    @Test
    void getAllTickets() {
        UUID tenant = UUID.randomUUID();
        when(ticketService.findAllByTenantId(tenant)).thenReturn(List.of(new Ticket()));

        ResponseEntity<List<Ticket>> res = controller.getAllTickets(tenant);
        assertEquals(200, res.getStatusCode().value());
        assertEquals(1, res.getBody().size());
    }

    @Test
    void getTicket() {
        UUID id = UUID.randomUUID();
        Ticket t = new Ticket();
        when(ticketService.findById(id)).thenReturn(t);

        ResponseEntity<Ticket> res = controller.getTicket(id);
        assertEquals(200, res.getStatusCode().value());
        assertEquals(t, res.getBody());
    }
}
