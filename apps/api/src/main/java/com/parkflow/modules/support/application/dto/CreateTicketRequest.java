package com.parkflow.modules.support.application.dto;

import com.parkflow.modules.support.domain.enums.Channel;
import com.parkflow.modules.support.domain.enums.TicketCategory;
import com.parkflow.modules.support.domain.enums.TicketPriority;
import java.util.UUID;

public record CreateTicketRequest(
    String title,
    String description,
    TicketPriority priority,
    TicketCategory category,
    Channel channel,
    UUID customerId,
    UUID tenantId
) {
}
