package com.parkflow.modules.audit.infrastructure;

import lombok.Builder;
import lombok.Getter;
import java.util.UUID;

public class AuditContextHolder {

    private static final ThreadLocal<AuditContext> contextHolder = new ThreadLocal<>();

    public static void setContext(AuditContext context) {
        contextHolder.set(context);
    }

    public static AuditContext getContext() {
        return contextHolder.get();
    }

    public static void clearContext() {
        contextHolder.remove();
    }

    @Getter
    @Builder
    public static class AuditContext {
        private String correlationId;
        private UUID userId;
        private String username;
        private String role;
        private UUID branchId;
        private String ipAddress;
        private String userAgent;
        private String device;
    }
}
