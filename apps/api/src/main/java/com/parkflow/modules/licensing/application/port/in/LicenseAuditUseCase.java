package com.parkflow.modules.licensing.application.port.in;

import com.parkflow.modules.licensing.domain.repository.*;
import com.parkflow.modules.licensing.dto.*;
import com.parkflow.modules.licensing.domain.*;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import com.parkflow.modules.licensing.enums.*;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface LicenseAuditUseCase {
  void recordPaymentAfterBlock(UUID companyId, String paymentReference, OffsetDateTime paymentDate);
  LicenseDiagnosticsResponse diagnoseCompany(UUID companyId);
  DeviceDiagnosticsResponse diagnoseDevice(String deviceFingerprint);
  List<SupportCaseResponse> getPrioritySupportCases();
  BlockStatisticsResponse getBlockStatistics(OffsetDateTime since);
  void markAsFalsePositive(UUID blockEventId, String resolvedBy, String notes);
}
