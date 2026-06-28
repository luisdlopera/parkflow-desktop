package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.OperationsSummaryResponse;
import java.time.ZoneId;


public interface SupervisorUseCase {
  OperationsSummaryResponse buildSummary(ZoneId siteZone);
}
