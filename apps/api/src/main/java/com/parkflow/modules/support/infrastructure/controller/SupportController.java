package com.parkflow.modules.support.infrastructure.controller;

import com.parkflow.modules.support.application.dto.CreateTicketRequest;
import com.parkflow.modules.support.application.port.in.TicketUseCase;
import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.TicketStatus;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@SuppressWarnings("deprecation")
@RestController
@Tag(name = "Support", description = "Support endpoints")
@RequestMapping("/api/v1/support/tickets")
@RequiredArgsConstructor
public class SupportController {

    private final TicketUseCase ticketService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create support ticket")
    @ApiResponse(responseCode = "201", description = "Ticket created")
    @ApiResponse(responseCode = "400", description = "Bad Request")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    public Ticket createTicket(@RequestBody CreateTicketRequest request) {
        return ticketService.createTicket(request);
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','SUPPORT')")
    @Operation(summary = "Assign ticket to agent")
    @ApiResponse(responseCode = "200", description = "Ticket assigned")
    @ApiResponse(responseCode = "400", description = "Bad Request")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @ApiResponse(responseCode = "404", description = "Ticket not found")
    public Ticket assignTicket(@PathVariable UUID id, @RequestParam UUID agentId) {
        return ticketService.assignTicket(id, agentId);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','SUPPORT')")
    @Operation(summary = "Update ticket status")
    @ApiResponse(responseCode = "200", description = "Status updated")
    @ApiResponse(responseCode = "400", description = "Bad Request")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    @ApiResponse(responseCode = "404", description = "Ticket not found")
    public Ticket updateStatus(@PathVariable UUID id, @RequestParam TicketStatus status) {
        return ticketService.updateStatus(id, status);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List support tickets")
    @ApiResponse(responseCode = "200", description = "Tickets retrieved")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    public List<Ticket> getAllTickets(@RequestParam UUID tenantId) {
        return ticketService.findAllByTenantId(tenantId);
    }

    @GetMapping("/{id}")
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
    public Ticket getTicket(@PathVariable UUID id) {
        return ticketService.findById(id);
    }

    @PostMapping("/{id}/messages")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
    public void addMessage(@PathVariable UUID id, @RequestBody String content) {
        ticketService.addMessageToTicket(id, content);
    }
}
