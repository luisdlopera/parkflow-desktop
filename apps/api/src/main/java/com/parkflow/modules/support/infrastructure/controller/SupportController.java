package com.parkflow.modules.support.infrastructure.controller;

import com.parkflow.modules.support.application.dto.CreateTicketRequest;
import com.parkflow.modules.support.application.port.in.TicketUseCase;
import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@SuppressWarnings("deprecation")
@RestController
@RequestMapping("/api/v1/support/tickets")
@RequiredArgsConstructor
public class SupportController {

    private final TicketUseCase ticketService;

    @PostMapping
    public Ticket createTicket(@RequestBody CreateTicketRequest request) {
        return ticketService.createTicket(request);
    }

    @PatchMapping("/{id}/assign")
    public Ticket assignTicket(@PathVariable UUID id, @RequestParam UUID agentId) {
        return ticketService.assignTicket(id, agentId);
    }

    @PatchMapping("/{id}/status")
    public Ticket updateStatus(@PathVariable UUID id, @RequestParam TicketStatus status) {
        return ticketService.updateStatus(id, status);
    }

    @GetMapping
    public List<Ticket> getAllTickets(@RequestParam UUID tenantId) {
        return ticketService.findAllByTenantId(tenantId);
    }

    @GetMapping("/{id}")
    public Ticket getTicket(@PathVariable UUID id) {
        return ticketService.findById(id);
    }

    @PostMapping("/{id}/messages")
    public void addMessage(@PathVariable UUID id, @RequestBody String content) {
        ticketService.addMessageToTicket(id, content);
    }
}
