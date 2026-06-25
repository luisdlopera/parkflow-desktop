package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.domain.LicenseBlockEvent;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Use case for recording license audit events.
 * Handles recording of blocks, failures, and resolutions.
 * Single responsibility: Audit event recording.
 */
public interface AuditRecorderUseCase {
    LicenseBlockEvent recordAutoBlock(
        UUID companyId,
        String deviceFingerprint,
        String reasonCode,
        String reasonDescription,
        Map<String, Object> diagnostics);

    void recordFailedValidation(
        UUID companyId,
        String deviceFingerprint,
        String errorCode,
        String errorMessage,
        Map<String, Object> context);

    void recordPaymentAfterBlock(UUID companyId, String paymentReference, OffsetDateTime paymentDate);

    void resolveBlockEvent(
        UUID blockEventId,
        String resolvedBy,
        String notes,
        String correctiveAction);

    void markAsFalsePositive(UUID blockEventId, String resolvedBy, String notes);
}
