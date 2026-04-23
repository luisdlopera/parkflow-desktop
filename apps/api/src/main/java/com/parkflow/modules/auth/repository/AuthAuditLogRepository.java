package com.parkflow.modules.auth.repository;

import com.parkflow.modules.auth.entity.AuthAuditLog;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthAuditLogRepository extends JpaRepository<AuthAuditLog, UUID> {}
