package com.parkflow.modules.audit.infrastructure;

import com.parkflow.modules.audit.domain.AuditDomainEvent;
import com.parkflow.modules.audit.domain.AuditEvent;
import com.parkflow.modules.audit.repository.AuditEventRepository;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Optional;

@Component
public class AuditEventListener {

    private final AuditEventRepository repository;

    public AuditEventListener(AuditEventRepository repository) {
        this.repository = repository;
    }

    @Async
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleAuditDomainEvent(AuditDomainEvent event) {
        // Find previous hash for integrity chain
        Optional<AuditEvent> previousEvent = repository.findFirstByOrderByTimestampUtcDesc();
        String previousHash = previousEvent.map(AuditEvent::getIntegrityHash).orElse(null);

        // Build entity
        AuditEvent auditEntity = AuditEvent.builder()
                .correlationId(event.getCorrelationId())
                .timestampUtc(OffsetDateTime.now())
                .userId(event.getUserId())
                .username(event.getUsername())
                .role(event.getRole())
                .branchId(event.getBranchId())
                .ipAddress(event.getIpAddress())
                .userAgent(event.getUserAgent())
                .device(event.getDevice())
                .module(event.getModule())
                .action(event.getAction())
                .entityName(event.getEntityName())
                .entityId(event.getEntityId())
                .status(event.getStatus())
                .oldData(event.getOldData())
                .newData(event.getNewData())
                .modifiedFields(event.getModifiedFields())
                .reason(event.getReason())
                .observations(event.getObservations())
                .executionTimeMs(event.getExecutionTimeMs())
                .previousHash(previousHash)
                .build();

        // Calculate current hash
        String currentHash = calculateHash(auditEntity);
        auditEntity.setIntegrityHash(currentHash);

        repository.save(auditEntity);
    }

    private String calculateHash(AuditEvent event) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            
            // Build string to hash
            StringBuilder dataToHash = new StringBuilder();
            dataToHash.append(event.getCorrelationId())
                      .append(event.getTimestampUtc())
                      .append(event.getModule())
                      .append(event.getAction())
                      .append(event.getStatus())
                      .append(event.getPreviousHash() != null ? event.getPreviousHash() : "");

            byte[] hashBytes = digest.digest(dataToHash.toString().getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashBytes);
            
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }
}
