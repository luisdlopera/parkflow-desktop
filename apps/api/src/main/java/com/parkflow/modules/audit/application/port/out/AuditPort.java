package com.parkflow.modules.audit.application.port.out;

import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.auth.domain.AppUser;

import java.util.UUID;

public interface AuditPort {

    void record(AuditAction action, UUID companyId, AppUser user,
                String previousPayload, String newPayload, String metadata);

    void record(AuditAction action, AppUser user,
                String previousPayload, String newPayload, String metadata);

    void record(AuditAction action, String previousPayload, String newPayload, String metadata);

    void record(AuditAction action, String previousPayload, String newPayload);

    void record(AuditAction action, AppUser user, String metadata);
}
