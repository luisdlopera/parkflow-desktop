package com.parkflow.modules.parking.operation.domain.event;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import java.math.BigDecimal;

public record SessionClosedEvent(
    ParkingSession session,
    AppUser operator,
    BigDecimal totalAmount
) {
}
