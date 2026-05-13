package com.parkflow.modules.sync.service;

import com.parkflow.modules.sync.dto.SyncEventResponse;
import com.parkflow.modules.sync.dto.SyncPushRequest;
import com.parkflow.modules.sync.dto.SyncReconcileRequest;
import com.parkflow.modules.auth.entity.AuthAuditAction;
import com.parkflow.modules.auth.service.AuthAuditService;
import com.parkflow.modules.sync.entity.SyncDirection;
import com.parkflow.modules.sync.entity.SyncEvent;
import com.parkflow.modules.sync.repository.SyncEventRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SyncService {
  private static final Logger log = LoggerFactory.getLogger(SyncService.class);

  private final SyncEventRepository syncEventRepository;
  private final AuthAuditService authAuditService;

  @Transactional
  public SyncEventResponse push(SyncPushRequest request) {
    Objects.requireNonNull(request, "request");
    return syncEventRepository
        .findByIdempotencyKey(request.idempotencyKey())
        .map(this::toResponse)
        .orElseGet(() -> create(request));
  }

  @Transactional(readOnly = true)
  public List<SyncEventResponse> pull(@Nullable OffsetDateTime after, int limit) {
    OffsetDateTime filter = after != null ? after : OffsetDateTime.parse("1970-01-01T00:00:00Z");
    return syncEventRepository.findByCreatedAtAfterOrderByCreatedAtAsc(filter).stream()
        .limit(Math.max(1, Math.min(limit, 500)))
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public List<SyncEventResponse> reconcile(SyncReconcileRequest request) {
    Objects.requireNonNull(request, "request");
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
    Objects.requireNonNull(request, "request");
    String idempotencyKey = Objects.requireNonNull(request.idempotencyKey(), "idempotencyKey");
    String eventType = Objects.requireNonNull(request.eventType(), "eventType");
    String aggregateId = Objects.requireNonNull(request.aggregateId(), "aggregateId");
    String payloadJson = Objects.requireNonNull(request.payloadJson(), "payloadJson");
    SyncEvent event = new SyncEvent();
    event.setIdempotencyKey(idempotencyKey);
    event.setEventType(eventType);
    event.setAggregateId(aggregateId);
    event.setPayloadJson(payloadJson);
    event.setUserId(request.userId());
    event.setDeviceId(request.deviceId());
    event.setSessionId(request.sessionId());
    event.setOrigin(request.origin() != null ? request.origin() : "ONLINE");
    event.setDirection(SyncDirection.PUSH);
    event.setCreatedAt(OffsetDateTime.now());
    var saved = syncEventRepository.save(event);
    MDC.put("aggregateId", aggregateId);
    try {
      log.info(
          "audit sync_push idempotencyKey={} eventType={}",
          idempotencyKey,
          eventType);
    } finally {
      MDC.clear();
    }

    if ("OFFLINE_PENDING_SYNC".equals(saved.getOrigin())) {
      authAuditService.log(
          AuthAuditAction.OFFLINE_SYNC,
          null,
          null,
          "OK",
          java.util.Map.of(
              "syncEventId", saved.getId().toString(),
              "eventType", saved.getEventType(),
              "userId", saved.getUserId() == null ? "" : saved.getUserId(),
              "deviceId", saved.getDeviceId() == null ? "" : saved.getDeviceId(),
              "sessionId", saved.getSessionId() == null ? "" : saved.getSessionId()));
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
        event.getUserId(),
        event.getDeviceId(),
        event.getSessionId(),
        event.getOrigin(),
        event.getDirection(),
        event.getCreatedAt(),
        event.getSyncedAt());
  }
}
