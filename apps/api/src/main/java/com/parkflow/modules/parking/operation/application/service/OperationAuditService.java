package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionEvent;
import com.parkflow.modules.parking.operation.domain.SessionEventType;
import com.parkflow.modules.parking.operation.domain.repository.SessionEventPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class OperationAuditService {

    private final SessionEventPort sessionEventPort;

    @Transactional(propagation = Propagation.MANDATORY)
    public void recordEvent(ParkingSession session, SessionEventType type, AppUser operator, String metadata) {
        SessionEvent event = new SessionEvent();
        event.setSession(session);
        event.setType(type);
        event.setActorUser(operator);
        event.setMetadata(metadata);
        event.setCreatedAt(OffsetDateTime.now());
        sessionEventPort.save(event);
    }
}
