package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Use case for querying license audit information.
 * Handles diagnostics and audit report queries.
 * Single responsibility: Audit data querying and diagnostics.
 */
public interface AuditQueryUseCase {
    LicenseDiagnosticsResponse diagnoseCompany(UUID companyId);

    DeviceDiagnosticsResponse diagnoseDevice(String deviceFingerprint);

    List<SupportCaseResponse> getPrioritySupportCases();

    BlockStatisticsResponse getBlockStatistics(OffsetDateTime since);
}
