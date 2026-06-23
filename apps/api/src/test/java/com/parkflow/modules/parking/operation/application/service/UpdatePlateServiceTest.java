package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionEventType;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.dto.UpdatePlateRequest;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UpdatePlateServiceTest {

  @Mock private ParkingSessionRepository sessionRepository;
  @Mock private OperationAuditService auditService;
  @Mock private AppUserPort userRepository;

  @InjectMocks private UpdatePlateService service;

  private UUID sessionId;
  private UUID userId;

  @BeforeEach
  void setUp() {
    sessionId = UUID.randomUUID();
    userId = UUID.randomUUID();
  }

  @Test
  void execute_ThrowsWhenSessionNotFound() {
    UpdatePlateRequest request = new UpdatePlateRequest("XYZ123", "Error tipografico");
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.execute(sessionId, request))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Sesión no encontrada");
  }

  @Test
  void execute_ThrowsWhenSessionNotActive() {
    UpdatePlateRequest request = new UpdatePlateRequest("XYZ123", "Error tipografico");
    ParkingSession session = org.mockito.Mockito.mock(ParkingSession.class, org.mockito.Mockito.RETURNS_DEEP_STUBS);
    when(session.getStatus()).thenReturn(SessionStatus.CLOSED);
    when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    assertThatThrownBy(() -> service.execute(sessionId, request))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Sólo se puede actualizar la placa de una sesión ACTIVA");
  }

  @Test
  void execute_ThrowsWhenUserNotFound() {
    try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
      securityUtils.when(SecurityUtils::requireUserId).thenReturn(userId);

      UpdatePlateRequest request = new UpdatePlateRequest("XYZ123", "Error tipografico");
      ParkingSession session = org.mockito.Mockito.mock(ParkingSession.class, org.mockito.Mockito.RETURNS_DEEP_STUBS);
      when(session.getStatus()).thenReturn(SessionStatus.ACTIVE);
      when(session.getPlate()).thenReturn("ABC123");
      when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
      when(userRepository.findById(userId)).thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.execute(sessionId, request))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Usuario no encontrado");
    }
  }

  @Test
  void execute_UpdatesPlateAndLogsEvent() {
    try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
      securityUtils.when(SecurityUtils::requireUserId).thenReturn(userId);

      UpdatePlateRequest request = new UpdatePlateRequest("XYZ123", "Error tipografico");
      ParkingSession session = org.mockito.Mockito.mock(ParkingSession.class, org.mockito.Mockito.RETURNS_DEEP_STUBS);
      when(session.getStatus()).thenReturn(SessionStatus.ACTIVE);
      when(session.getPlate()).thenReturn("ABC123");
      when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

      AppUser user = new AppUser();
      when(userRepository.findById(userId)).thenReturn(Optional.of(user));

      service.execute(sessionId, request);

      verify(session).setPlate("XYZ123");
      verify(sessionRepository).save(session);
      verify(auditService).recordEvent(
          eq(session),
          eq(SessionEventType.PLATE_CORRECTED),
          eq(user),
          any(String.class)
      );
    }
  }
}
