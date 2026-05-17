package com.parkflow.modules.parking.operation.domain.event;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;

public record SessionVoidedEvent(
    ParkingSession session,
    AppUser operator,
    String reason
) {
}
