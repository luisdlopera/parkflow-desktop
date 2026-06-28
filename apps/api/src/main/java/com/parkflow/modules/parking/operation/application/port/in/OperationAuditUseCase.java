package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionEventType;


public interface OperationAuditUseCase {
  void recordEvent(ParkingSession session, SessionEventType type, AppUser operator, String metadata);
}
