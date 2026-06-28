package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.dto.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;


public interface LicenseAuditUseCase {
  void recordPaymentAfterBlock(UUID companyId, String paymentReference, OffsetDateTime paymentDate);
  LicenseDiagnosticsResponse diagnoseCompany(UUID companyId);
  DeviceDiagnosticsResponse diagnoseDevice(String deviceFingerprint);
  List<SupportCaseResponse> getPrioritySupportCases();
  BlockStatisticsResponse getBlockStatistics(OffsetDateTime since);
  void markAsFalsePositive(UUID blockEventId, String resolvedBy, String notes);
}
