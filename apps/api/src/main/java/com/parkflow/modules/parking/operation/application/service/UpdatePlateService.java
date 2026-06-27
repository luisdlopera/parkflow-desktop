package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.audit.domain.Auditable;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.application.port.in.UpdatePlateUseCase;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.SessionEventType;
import com.parkflow.modules.parking.operation.domain.LicensePlate;
import com.parkflow.modules.parking.operation.dto.UpdatePlateRequest;
import com.parkflow.modules.parking.operation.infrastructure.persistence.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.application.port.out.AppUserPort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.security.SecurityUtils;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UpdatePlateService implements UpdatePlateUseCase {

    private final ParkingSessionRepository sessionRepository;
    private final OperationAuditService auditService;
    private final AppUserPort userRepository;

    public UpdatePlateService(ParkingSessionRepository sessionRepository, OperationAuditService auditService, AppUserPort userRepository) {
        this.sessionRepository = sessionRepository;
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    @Auditable(module = "OPERACION", action = "ACTUALIZAR_PLACA", entityClass = ParkingSession.class)
    public void execute(UUID sessionId, UpdatePlateRequest request) {
        ParkingSession session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesión no encontrada"));

        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "Sólo se puede actualizar la placa de una sesión ACTIVA");
        }

        String oldPlate = session.getPlate();
        LicensePlate newPlate = new LicensePlate(request.newPlate());
        session.setPlate(newPlate.value());
        sessionRepository.save(session);

        AppUser user = userRepository.findById(SecurityUtils.requireUserId())
            .orElseThrow(() -> new OperationException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        String details = "Placa corregida de " + oldPlate + " a " + session.getPlate() + ". Motivo: " + request.justification();
        auditService.recordEvent(session, SessionEventType.PLATE_CORRECTED, user, details);
    }
}
