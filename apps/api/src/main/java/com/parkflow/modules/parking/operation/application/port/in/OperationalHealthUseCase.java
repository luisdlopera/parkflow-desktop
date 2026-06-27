package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.domain.repository.CashSessionPort;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import com.parkflow.modules.parking.operation.dto.OperationalHealthResponse;
import com.parkflow.modules.sync.domain.repository.SyncEventPort;
import com.parkflow.modules.tickets.domain.PrintJobStatus;
import com.parkflow.modules.tickets.domain.repository.PrintJobPort;
import com.parkflow.modules.auth.security.SecurityUtils;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface OperationalHealthUseCase {
  OperationalHealthResponse getOperationalHealth();
}
