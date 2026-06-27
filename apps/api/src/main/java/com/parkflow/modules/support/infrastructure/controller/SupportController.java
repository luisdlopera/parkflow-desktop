package com.parkflow.modules.support.infrastructure.controller;

import com.parkflow.modules.support.application.dto.CreateTicketRequest;
import com.parkflow.modules.support.application.port.in.TicketUseCase;
import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<Ticket> createTicket(@RequestBody CreateTicketRequest request) {
        Ticket ticket = ticketService.createTicket(request);
        return ResponseEntity.ok(ticket);
    }

    @PatchMapping("/{id}/assign")
    public ResponseEntity<Ticket> assignTicket(@PathVariable UUID id, @RequestParam UUID agentId) {
        Ticket ticket = ticketService.assignTicket(id, agentId);
        return ResponseEntity.ok(ticket);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Ticket> updateStatus(@PathVariable UUID id, @RequestParam TicketStatus status) {
        Ticket ticket = ticketService.updateStatus(id, status);
        return ResponseEntity.ok(ticket);
    }

    @GetMapping
    public ResponseEntity<List<Ticket>> getAllTickets(@RequestParam UUID tenantId) {
        List<Ticket> tickets = ticketService.findAllByTenantId(tenantId);
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Ticket> getTicket(@PathVariable UUID id) {
        Ticket ticket = ticketService.findById(id);
        return ResponseEntity.ok(ticket);
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<Void> addMessage(@PathVariable UUID id, @RequestBody String content) {
        ticketService.addMessageToTicket(id, content);
        return ResponseEntity.ok().build();
    }
}
