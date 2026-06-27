package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionEvent;
import com.parkflow.modules.parking.operation.domain.SessionEventType;
import com.parkflow.modules.parking.operation.domain.repository.SessionEventPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Async;
import java.time.OffsetDateTime;

public interface OperationAuditUseCase {
  void recordEvent(ParkingSession session, SessionEventType type, AppUser operator, String metadata);
}
