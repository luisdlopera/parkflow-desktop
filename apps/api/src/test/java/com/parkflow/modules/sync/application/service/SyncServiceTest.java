package com.parkflow.modules.sync.application.service;

import com.parkflow.modules.auth.application.service.AuthAuditService;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.sync.domain.SyncDirection;
import com.parkflow.modules.sync.domain.SyncEvent;
import com.parkflow.modules.sync.domain.repository.SyncEventPort;
import com.parkflow.modules.sync.dto.SyncEventResponse;
import com.parkflow.modules.sync.dto.SyncPushRequest;
import com.parkflow.modules.sync.dto.SyncReconcileRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SyncServiceTest {

    private static final UUID COMPANY_ID = UUID.randomUUID();
    private static final String IDEMPOTENCY_KEY = "evt-001";

    @Mock
    private SyncEventPort syncEventRepository;

    @Mock
    private AuthAuditService authAuditService;

    @Captor
    private ArgumentCaptor<SyncEvent> eventCaptor;

    private SyncService syncService;

    @BeforeEach
    void setUp() {
        syncService = new SyncService(syncEventRepository, authAuditService);
    }

    @Test
    void shouldCreateNewEventOnPush() {
        SyncPushRequest request = new SyncPushRequest(
            IDEMPOTENCY_KEY, "TICKET_ENTRY", "agg-1",
            "{\"plate\":\"ABC123\"}", "user-1", "dev-1",
            "session-1", "ONLINE");

        SyncEvent savedEvent = new SyncEvent();
        savedEvent.setId(UUID.randomUUID());
        savedEvent.setCompanyId(COMPANY_ID);
        savedEvent.setIdempotencyKey(IDEMPOTENCY_KEY);
        savedEvent.setEventType("TICKET_ENTRY");
        savedEvent.setAggregateId("agg-1");
        savedEvent.setPayloadJson("{\"plate\":\"ABC123\"}");
        savedEvent.setUserId("user-1");
        savedEvent.setDeviceId("dev-1");
        savedEvent.setSessionId("session-1");
        savedEvent.setOrigin("ONLINE");
        savedEvent.setDirection(SyncDirection.PUSH);
        savedEvent.setCreatedAt(OffsetDateTime.now());

        when(syncEventRepository.findByIdempotencyKeyAndCompanyId(eq(IDEMPOTENCY_KEY), eq(COMPANY_ID)))
            .thenReturn(Optional.empty());
        when(syncEventRepository.save(any())).thenReturn(savedEvent);

        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            securityUtils.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);

            SyncEventResponse response = syncService.push(request);

            assertThat(response.idempotencyKey()).isEqualTo(IDEMPOTENCY_KEY);
            assertThat(response.eventType()).isEqualTo("TICKET_ENTRY");
            assertThat(response.direction()).isEqualTo(SyncDirection.PUSH);
            verify(syncEventRepository).save(eventCaptor.capture());
            SyncEvent captured = eventCaptor.getValue();
            assertThat(captured.getIdempotencyKey()).isEqualTo(IDEMPOTENCY_KEY);
            assertThat(captured.getOrigin()).isEqualTo("ONLINE");
        }
    }

    @Test
    void shouldReturnExistingEventOnIdempotentPush() {
        SyncPushRequest request = new SyncPushRequest(
            IDEMPOTENCY_KEY, "TICKET_ENTRY", "agg-1",
            "{\"plate\":\"ABC123\"}", null, null, null, null);

        SyncEvent existingEvent = new SyncEvent();
        existingEvent.setId(UUID.randomUUID());
        existingEvent.setCompanyId(COMPANY_ID);
        existingEvent.setIdempotencyKey(IDEMPOTENCY_KEY);
        existingEvent.setEventType("TICKET_ENTRY");
        existingEvent.setDirection(SyncDirection.PUSH);
        existingEvent.setCreatedAt(OffsetDateTime.now());

        when(syncEventRepository.findByIdempotencyKeyAndCompanyId(eq(IDEMPOTENCY_KEY), eq(COMPANY_ID)))
            .thenReturn(Optional.of(existingEvent));

        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            securityUtils.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);

            SyncEventResponse response = syncService.push(request);

            assertThat(response.idempotencyKey()).isEqualTo(IDEMPOTENCY_KEY);
            verify(syncEventRepository, never()).save(any());
        }
    }

    @Test
    void shouldLogAuditForOfflineSync() {
        SyncPushRequest request = new SyncPushRequest(
            IDEMPOTENCY_KEY, "TICKET_ENTRY", "agg-1",
            "{\"plate\":\"ABC123\"}", "user-1", "dev-1",
            "session-1", "OFFLINE_PENDING_SYNC");

        SyncEvent savedEvent = new SyncEvent();
        savedEvent.setId(UUID.randomUUID());
        savedEvent.setCompanyId(COMPANY_ID);
        savedEvent.setIdempotencyKey(IDEMPOTENCY_KEY);
        savedEvent.setEventType("TICKET_ENTRY");
        savedEvent.setOrigin("OFFLINE_PENDING_SYNC");
        savedEvent.setDirection(SyncDirection.PUSH);
        savedEvent.setCreatedAt(OffsetDateTime.now());

        when(syncEventRepository.findByIdempotencyKeyAndCompanyId(eq(IDEMPOTENCY_KEY), eq(COMPANY_ID)))
            .thenReturn(Optional.empty());
        when(syncEventRepository.save(any())).thenReturn(savedEvent);

        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            securityUtils.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);

            syncService.push(request);

            verify(authAuditService).log(
                eq(AuthAuditAction.OFFLINE_SYNC), any(), any(), eq("OK"), any());
        }
    }

    @Test
    void shouldRejectNullPushRequest() {
        assertThatThrownBy(() -> syncService.push(null))
            .isInstanceOf(NullPointerException.class);
    }

    @Test
    void shouldPullEventsAfterTimestamp() {
        OffsetDateTime after = OffsetDateTime.now().minusHours(1);
        SyncEvent event = new SyncEvent();
        event.setId(UUID.randomUUID());
        event.setCompanyId(COMPANY_ID);
        event.setEventType("TICKET_ENTRY");
        event.setDirection(SyncDirection.PUSH);
        event.setCreatedAt(OffsetDateTime.now());

        when(syncEventRepository.findByCompanyIdAndCreatedAtAfterOrderByCreatedAtAsc(eq(COMPANY_ID), eq(after)))
            .thenReturn(List.of(event, event));

        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            securityUtils.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);

            List<SyncEventResponse> responses = syncService.pull(after, 100);

            assertThat(responses).hasSize(2);
        }
    }

    @Test
    void shouldUseDefaultEpochWhenAfterIsNull() {
        OffsetDateTime defaultAfter = OffsetDateTime.parse("1970-01-01T00:00:00Z");

        when(syncEventRepository.findByCompanyIdAndCreatedAtAfterOrderByCreatedAtAsc(eq(COMPANY_ID), eq(defaultAfter)))
            .thenReturn(List.of());

        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            securityUtils.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);

            syncService.pull(null, 100);

            verify(syncEventRepository)
                .findByCompanyIdAndCreatedAtAfterOrderByCreatedAtAsc(eq(COMPANY_ID), eq(defaultAfter));
        }
    }

    @Test
    void shouldLimitPullResultsTo500() {
        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            securityUtils.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
            when(syncEventRepository.findByCompanyIdAndCreatedAtAfterOrderByCreatedAtAsc(any(), any()))
                .thenReturn(List.of());

            syncService.pull(null, 1000);

            verify(syncEventRepository)
                .findByCompanyIdAndCreatedAtAfterOrderByCreatedAtAsc(any(), any());
        }
    }

    @Test
    void shouldReconcileEvents() {
        UUID eventId = UUID.randomUUID();
        SyncReconcileRequest request = new SyncReconcileRequest(List.of(eventId));

        SyncEvent event = new SyncEvent();
        event.setId(eventId);
        event.setCompanyId(COMPANY_ID);
        event.setEventType("TICKET_ENTRY");
        event.setDirection(SyncDirection.PUSH);
        event.setCreatedAt(OffsetDateTime.now());
        event.setSyncedAt(null);

        when(syncEventRepository.findById(eq(eventId))).thenReturn(Optional.of(event));
        when(syncEventRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            securityUtils.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);

            List<SyncEventResponse> responses = syncService.reconcile(request);

            assertThat(responses).hasSize(1);
            assertThat(responses.get(0).syncedAt()).isNotNull();
        }
    }

    @Test
    void shouldSkipReconcileForDifferentCompany() {
        UUID eventId = UUID.randomUUID();
        SyncReconcileRequest request = new SyncReconcileRequest(List.of(eventId));

        SyncEvent event = new SyncEvent();
        event.setId(eventId);
        event.setCompanyId(UUID.randomUUID());
        event.setCreatedAt(OffsetDateTime.now());

        when(syncEventRepository.findById(eq(eventId))).thenReturn(Optional.of(event));

        try (MockedStatic<SecurityUtils> securityUtils = mockStatic(SecurityUtils.class)) {
            securityUtils.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);

            List<SyncEventResponse> responses = syncService.reconcile(request);

            assertThat(responses).isEmpty();
            verify(syncEventRepository, never()).save(any());
        }
    }
}
