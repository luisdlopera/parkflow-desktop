package com.parkflow.modules.audit.application;

import com.parkflow.modules.audit.domain.AuditEvent;
import com.parkflow.modules.audit.repository.AuditEventRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AuditQueryService {

    private final AuditEventRepository repository;

    public AuditQueryService(AuditEventRepository repository) {
        this.repository = repository;
    }

    public Page<AuditEvent> getAuditEvents(
            String module,
            String action,
            UUID userId,
            OffsetDateTime startDate,
            OffsetDateTime endDate,
            Pageable pageable) {
        
        Specification<AuditEvent> spec = Specification.where(null);
        
        UUID tenantId = com.parkflow.modules.auth.security.TenantContext.getTenantId();
        if (tenantId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("branchId"), tenantId));
        }
        
        if (module != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("module"), module));
        }
        if (action != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("action"), action));
        }
        if (userId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("userId"), userId));
        }
        if (startDate != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("timestampUtc"), startDate));
        }
        if (endDate != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("timestampUtc"), endDate));
        }

        return repository.findAll(spec, pageable);
    }

    public AuditEvent getAuditEventDetails(UUID id) {
        UUID tenantId = com.parkflow.modules.auth.security.TenantContext.getTenantId();
        return repository.findById(id)
                .filter(event -> tenantId == null || tenantId.equals(event.getBranchId()))
                .orElseThrow(() -> new RuntimeException("Audit event not found"));
    }

    public boolean validateIntegrity(UUID id) {
        AuditEvent event = getAuditEventDetails(id);
        String expectedHash = event.getIntegrityHash();
        
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            StringBuilder dataToHash = new StringBuilder();
            dataToHash.append(event.getCorrelationId())
                      .append(event.getTimestampUtc())
                      .append(event.getModule())
                      .append(event.getAction())
                      .append(event.getStatus())
                      .append(event.getPreviousHash() != null ? event.getPreviousHash() : "");

            byte[] hashBytes = digest.digest(dataToHash.toString().getBytes(StandardCharsets.UTF_8));
            String calculatedHash = Base64.getEncoder().encodeToString(hashBytes);
            
            return expectedHash.equals(calculatedHash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }
}
