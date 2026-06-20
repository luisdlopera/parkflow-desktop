package com.parkflow.modules.common.outbox.application;

import com.parkflow.modules.common.outbox.domain.OutboxEvent;
import com.parkflow.modules.common.outbox.infrastructure.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxPublisher {

  private static final int MAX_RETRIES = 3;

  private final OutboxEventRepository outboxEventRepository;
  private final ApplicationEventPublisher eventPublisher;

  @Transactional
  public void publish(String aggregateType, String aggregateId, String eventType,
                      Map<String, Object> payload, UUID companyId) {
    OutboxEvent event = new OutboxEvent();
    event.setAggregateType(aggregateType);
    event.setAggregateId(aggregateId);
    event.setEventType(eventType);
    event.setPayload(payload != null ? payload : Map.of());
    event.setCompanyId(companyId);
    outboxEventRepository.save(event);
  }

  @Scheduled(fixedDelayString = "${app.outbox.poll-ms:5000}")
  @Transactional
  public void processPendingEvents() {
    List<OutboxEvent> pending = outboxEventRepository.findPendingBatch();
    if (pending.isEmpty()) return;

    log.debug("Processing {} outbox events", pending.size());
    for (OutboxEvent event : pending) {
      try {
        eventPublisher.publishEvent(new OutboxEventDelivered(event));
        event.setProcessedAt(OffsetDateTime.now());
        outboxEventRepository.save(event);
      } catch (Exception ex) {
        event.setRetryCount(event.getRetryCount() + 1);
        if (event.getRetryCount() >= MAX_RETRIES) {
          event.setFailedAt(OffsetDateTime.now());
          event.setFailureReason(ex.getMessage());
          log.error("Outbox event {} permanently failed after {} retries: {}",
              event.getId(), MAX_RETRIES, ex.getMessage());
        } else {
          log.warn("Outbox event {} failed (attempt {}), will retry: {}",
              event.getId(), event.getRetryCount(), ex.getMessage());
        }
        outboxEventRepository.save(event);
      }
    }
  }

  public record OutboxEventDelivered(OutboxEvent event) {}
}
