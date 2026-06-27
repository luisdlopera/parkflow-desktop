package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.repository.RatePort;
import com.parkflow.modules.common.dto.RateResponse;
import com.parkflow.modules.common.dto.SettingsPageResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface RateQueryUseCase {
  SettingsPageResponse<RateResponse> list(String site, String q, Boolean active, String category, Pageable pageable);
  RateResponse get(UUID id);
}
