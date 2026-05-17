package com.parkflow.modules.parking.operation.domain.event;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import java.math.BigDecimal;

public record SessionLostTicketEvent(
    ParkingSession session,
    AppUser operator,
    BigDecimal totalAmount,
    String reason
) {
}
