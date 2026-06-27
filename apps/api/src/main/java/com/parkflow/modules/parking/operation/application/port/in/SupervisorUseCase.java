package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.OperationsSummaryResponse;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.sync.domain.repository.SyncEventPort;
import com.parkflow.modules.tickets.domain.PrintJobStatus;
import com.parkflow.modules.tickets.domain.repository.PrintJobPort;
import com.parkflow.modules.auth.security.SecurityUtils;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.EnumSet;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface SupervisorUseCase {
  OperationsSummaryResponse buildSummary(ZoneId siteZone);
}
