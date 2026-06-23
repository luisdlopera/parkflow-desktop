package com.parkflow.modules.common.outbox.application;

import com.parkflow.modules.common.outbox.domain.OutboxEvent;
import com.parkflow.modules.common.outbox.infrastructure.OutboxEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OutboxPublisherTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private OutboxPublisher outboxPublisher;

    @Test
    void publish_SavesEvent() {
        UUID companyId = UUID.randomUUID();
        Map<String, Object> payload = Map.of("key", "value");

        outboxPublisher.publish("Order", "123", "OrderCreated", payload, companyId);

        ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository).save(captor.capture());

        OutboxEvent saved = captor.getValue();
        assertEquals("Order", saved.getAggregateType());
        assertEquals("123", saved.getAggregateId());
        assertEquals("OrderCreated", saved.getEventType());
        assertEquals(payload, saved.getPayload());
        assertEquals(companyId, saved.getCompanyId());
    }

    @Test
    void publish_WithNullPayload_SavesEmptyMap() {
        UUID companyId = UUID.randomUUID();

        outboxPublisher.publish("Order", "123", "OrderCreated", null, companyId);

        ArgumentCaptor<OutboxEvent> captor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository).save(captor.capture());

        OutboxEvent saved = captor.getValue();
        assertTrue(saved.getPayload().isEmpty());
    }

    @Test
    void processPendingEvents_NoPendingEvents_DoesNothing() {
        when(outboxEventRepository.findPendingBatch()).thenReturn(List.of());

        outboxPublisher.processPendingEvents();

        verify(eventPublisher, never()).publishEvent(any());
        verify(outboxEventRepository, never()).save(any());
    }

    @Test
    void processPendingEvents_Success() {
        OutboxEvent event = new OutboxEvent();
        event.setId(UUID.randomUUID());
        when(outboxEventRepository.findPendingBatch()).thenReturn(List.of(event));

        outboxPublisher.processPendingEvents();

        verify(eventPublisher).publishEvent(any(OutboxPublisher.OutboxEventDelivered.class));
        assertNotNull(event.getProcessedAt());
        verify(outboxEventRepository).save(event);
    }

    @Test
    void processPendingEvents_ExceptionOnPublish_IncrementsRetryCount() {
        OutboxEvent event = new OutboxEvent();
        event.setId(UUID.randomUUID());
        event.setRetryCount(0);
        when(outboxEventRepository.findPendingBatch()).thenReturn(List.of(event));

        doThrow(new RuntimeException("Test exception")).when(eventPublisher).publishEvent(any(OutboxPublisher.OutboxEventDelivered.class));

        outboxPublisher.processPendingEvents();

        assertEquals(1, event.getRetryCount());
        assertNull(event.getProcessedAt());
        assertNull(event.getFailedAt());
        verify(outboxEventRepository).save(event);
    }

    @Test
    void processPendingEvents_ExceptionOnPublish_MaxRetriesReached_MarksFailed() {
        OutboxEvent event = new OutboxEvent();
        event.setId(UUID.randomUUID());
        event.setRetryCount(2); // Next is 3, which is MAX_RETRIES
        when(outboxEventRepository.findPendingBatch()).thenReturn(List.of(event));

        doThrow(new RuntimeException("Final exception")).when(eventPublisher).publishEvent(any(OutboxPublisher.OutboxEventDelivered.class));

        outboxPublisher.processPendingEvents();

        assertEquals(3, event.getRetryCount());
        assertNull(event.getProcessedAt());
        assertNotNull(event.getFailedAt());
        assertEquals("Final exception", event.getFailureReason());
        verify(outboxEventRepository).save(event);
    }
}
