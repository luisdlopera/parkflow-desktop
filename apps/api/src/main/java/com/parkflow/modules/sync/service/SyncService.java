package com.parkflow.modules.sync.service;

import com.parkflow.modules.sync.dto.SyncEventResponse;
import com.parkflow.modules.sync.dto.SyncPushRequest;
import com.parkflow.modules.sync.dto.SyncReconcileRequest;
import com.parkflow.modules.sync.entity.SyncDirection;
import com.parkflow.modules.sync.entity.SyncEvent;
import com.parkflow.modules.sync.repository.SyncEventRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SyncService {
  private static final Logger log = LoggerFactory.getLogger(SyncService.class);

  private final SyncEventRepository syncEventRepository;

  @Transactional
  public SyncEventResponse push(SyncPushRequest request) {
    return syncEventRepository
        .findByIdempotencyKey(request.idempotencyKey())
        .map(this::toResponse)
        .orElseGet(() -> create(request));
  }

  @Transactional(readOnly = true)
  public List<SyncEventResponse> pull(OffsetDateTime after, int limit) {
    OffsetDateTime filter = after != null ? after : OffsetDateTime.parse("1970-01-01T00:00:00Z");
    return syncEventRepository.findByCreatedAtAfterOrderByCreatedAtAsc(filter).stream()
        .limit(Math.max(1, Math.min(limit, 500)))
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public List<SyncEventResponse> reconcile(SyncReconcileRequest request) {
    OffsetDateTime now = OffsetDateTime.now();
    List<SyncEventResponse> out = new ArrayList<>();
    for (var id : request.eventIds()) {
      syncEventRepository
          .findById(id)
          .ifPresent(
              event -> {
                event.setSyncedAt(now);
                var saved = syncEventRepository.save(event);
                out.add(toResponse(saved));
                MDC.put("syncEventId", id.toString());
                try {
                  log.info(
                      "audit sync_reconcile idempotencyKey={} eventType={}",
                      saved.getIdempotencyKey(),
                      saved.getEventType());
                } finally {
                  MDC.clear();
                }
              });
    }
    return out;
  }

  private SyncEventResponse create(SyncPushRequest request) {
    SyncEvent event = new SyncEvent();
    event.setIdempotencyKey(request.idempotencyKey());
    event.setEventType(request.eventType());
    event.setAggregateId(request.aggregateId());
    event.setPayloadJson(request.payloadJson());
    event.setDirection(SyncDirection.PUSH);
    event.setCreatedAt(OffsetDateTime.now());
    var saved = syncEventRepository.save(event);
    MDC.put("aggregateId", request.aggregateId());
    try {
      log.info(
          "audit sync_push idempotencyKey={} eventType={}",
          request.idempotencyKey(),
          request.eventType());
    } finally {
      MDC.clear();
    }
    return toResponse(saved);
  }

  private SyncEventResponse toResponse(SyncEvent event) {
    return new SyncEventResponse(
        event.getId(),
        event.getIdempotencyKey(),
        event.getEventType(),
        event.getAggregateId(),
        event.getPayloadJson(),
        event.getDirection(),
        event.getCreatedAt(),
        event.getSyncedAt());
  }
}
