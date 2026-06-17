package com.parkflow.modules.audit.repository;

import com.parkflow.modules.audit.domain.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID>, JpaSpecificationExecutor<AuditEvent> {
    
    /**
     * Finds the most recent audit event to get the previous hash for the integrity chain.
     */
    Optional<AuditEvent> findFirstByOrderByTimestampUtcDesc();
}
