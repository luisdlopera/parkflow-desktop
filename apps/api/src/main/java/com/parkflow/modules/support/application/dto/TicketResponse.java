package com.parkflow.modules.support.application.dto;

import com.parkflow.modules.support.domain.Ticket;
import com.parkflow.modules.support.domain.enums.Channel;
import com.parkflow.modules.support.domain.enums.TicketCategory;
import com.parkflow.modules.support.domain.enums.TicketPriority;
import com.parkflow.modules.support.domain.enums.TicketStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Read-only DTO for Ticket responses.
 * <p>
 * Prevents JPA entity exposure at the API layer (prevents N+1 leaks, lazy-load issues,
 * and internal field exposure). Map once from domain entity, return this.
 */
public record TicketResponse(
    UUID id,
    String ticketNumber,
    String title,
    String description,
    TicketStatus status,
    TicketPriority priority,
    TicketCategory category,
    Channel channel,
    UUID customerId,
    UUID assignedAgentId,
    UUID tenantId,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    OffsetDateTime closedAt
) {
    /**
     * Maps a domain Ticket entity to TicketResponse.
     * Call this in the service or controller — not in the entity itself.
     */
    public static TicketResponse from(Ticket ticket) {
        return new TicketResponse(
            ticket.getId(),
            ticket.getTicketNumber(),
            ticket.getTitle(),
            ticket.getDescription(),
            ticket.getStatus(),
            ticket.getPriority(),
            ticket.getCategory(),
            ticket.getChannel(),
            ticket.getCustomerId(),
            ticket.getAssignedAgentId(),
            ticket.getTenantId(),
            ticket.getCreatedAt(),
            ticket.getUpdatedAt(),
            ticket.getClosedAt()
        );
    }
}
