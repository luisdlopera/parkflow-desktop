package com.parkflow.modules.licensing.application.port.in;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Input port for company status operations: login tracking.
 */
public interface CompanyStatusUseCase {
    void recordLoginAttempt(UUID companyId);
    void updateLastLogin(UUID companyId, OffsetDateTime timestamp);
}
