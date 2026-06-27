package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionEvent;
import com.parkflow.modules.parking.operation.domain.SessionEventType;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.repository.SessionEventPort;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OperationAuditServiceTest {

    @Mock private SessionEventPort sessionEventPort;

    @InjectMocks
    private OperationAuditService service;

    private ParkingSession session;
    private AppUser operator;

    @BeforeEach
    void setUp() {
        session = ParkingSession.builder()
            .id(UUID.randomUUID())
            .ticketNumber("T001")
            .companyId(UUID.randomUUID())
            .status(SessionStatus.ACTIVE)
            .build();

        operator = new AppUser();
        operator.setId(UUID.randomUUID());
        operator.setName("Operador Test");
    }

    @Nested
    class RecordEvent {

        @Test
        void savesSessionEventWithCorrectType() {
            when(sessionEventPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

            assertThatCode(() -> service.recordEvent(session, SessionEventType.ENTRY_RECORDED, operator, "{}"))
                .doesNotThrowAnyException();

            ArgumentCaptor<SessionEvent> captor = ArgumentCaptor.forClass(SessionEvent.class);
            verify(sessionEventPort).save(captor.capture());
            SessionEvent event = captor.getValue();
            assertThat(event.getType()).isEqualTo(SessionEventType.ENTRY_RECORDED);
            assertThat(event.getSession()).isSameAs(session);
            assertThat(event.getActorUser()).isSameAs(operator);
            assertThat(event.getMetadata()).isEqualTo("{}");
            assertThat(event.getCreatedAt()).isNotNull();
        }

        @Test
        void savesExitEventType() {
            when(sessionEventPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.recordEvent(session, SessionEventType.EXIT_RECORDED, operator, "exit-meta");

            ArgumentCaptor<SessionEvent> captor = ArgumentCaptor.forClass(SessionEvent.class);
            verify(sessionEventPort).save(captor.capture());
            assertThat(captor.getValue().getType()).isEqualTo(SessionEventType.EXIT_RECORDED);
        }

        @Test
        void savesVoidEventType() {
            when(sessionEventPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.recordEvent(session, SessionEventType.VOIDED, operator, "voided by manager");

            verify(sessionEventPort).save(argThat(e ->
                e.getType() == SessionEventType.VOIDED &&
                "voided by manager".equals(e.getMetadata())));
        }

        @Test
        void acceptsNullOperator() {
            when(sessionEventPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

            assertThatCode(() -> service.recordEvent(session, SessionEventType.ENTRY_RECORDED, null, null))
                .doesNotThrowAnyException();

            ArgumentCaptor<SessionEvent> captor = ArgumentCaptor.forClass(SessionEvent.class);
            verify(sessionEventPort).save(captor.capture());
            assertThat(captor.getValue().getActorUser()).isNull();
        }

        @Test
        void acceptsNullMetadata() {
            when(sessionEventPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.recordEvent(session, SessionEventType.TICKET_REPRINTED, operator, null);

            verify(sessionEventPort).save(argThat(e -> e.getMetadata() == null));
        }
    }
}
